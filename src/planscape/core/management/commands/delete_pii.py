from allauth.account.models import EmailAddress, EmailConfirmation
from allauth.socialaccount.models import SocialAccount, SocialToken
from climate_foresight.models import (
    ClimateForesightLandscapeRollup,
    ClimateForesightPillar,
    ClimateForesightPillarRollup,
    ClimateForesightPromote,
    ClimateForesightRun,
    ClimateForesightRunInputDataLayer,
)
from collaboration.models import UserObjectRole
from datasets.models import Category, DataLayer, Dataset, Style
from django.conf import settings
from django.contrib.admin.models import LogEntry
from django.contrib.auth import get_user_model
from django.contrib.auth.models import User as AuthUser
from django.core.management.base import BaseCommand
from django.db import connection
from impacts.models import (
    ProjectAreaTreatmentResult,
    TreatmentPlan,
    TreatmentPlanNote,
    TreatmentPrescription,
    TreatmentResult,
)
from organizations.models import Organization
from password_policies.models import PasswordRecord
from planning.models import (
    PlanningArea,
    PlanningAreaNote,
    ProjectArea,
    ProjectAreaNote,
    Scenario,
    ScenarioResult,
    SharedLink,
    TreatmentGoal,
    UserPrefs,
)

User = get_user_model()

ADMIN_EMAIL = "admin@planscape.org"


class Command(BaseCommand):
    help = "Deletes all PII and user data from Planscape, excluding the datasets app and organizations."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print counts of records that would be deleted/updated without applying changes.",
        )

    def _get_or_create_admin(self):
        admin, created = User.objects.get_or_create(
            email=ADMIN_EMAIL,
            defaults={
                "username": "admin",
                "first_name": "Admin",
                "last_name": "Planscape",
                "is_staff": True,
                "is_superuser": True,
                "is_active": True,
            },
        )
        if created:
            self.stdout.write(
                self.style.WARNING(f"Created admin user ({ADMIN_EMAIL}).")
            )
        else:
            self.stdout.write(f"Found existing admin user ({ADMIN_EMAIL}).")
        return admin

    def _count(self, table, where="", params=None):
        sql = f"SELECT COUNT(*) FROM {table}"
        if where:
            sql += f" WHERE {where}"
        with connection.cursor() as cursor:
            cursor.execute(sql, params or [])
            row = cursor.fetchone()
            return row[0] if row else 0

    def _update(self, table, set_clause, where="", params=None):
        sql = f"UPDATE {table} SET {set_clause}"
        if where:
            sql += f" WHERE {where}"
        with connection.cursor() as cursor:
            cursor.execute(sql, params or [])
            return cursor.rowcount

    def _delete(self, table, where="", params=None):
        sql = f"DELETE FROM {table}"
        if where:
            sql += f" WHERE {where}"
        with connection.cursor() as cursor:
            cursor.execute(sql, params or [])
            return cursor.rowcount

    def _reassign_created_by(self, admin, dry_run):
        """
        Reassign created_by (and updated_by) on all models that carry those fields
        to the admin user. This ensures Organization/datasets integrity is preserved
        and that RESTRICT constraints do not block non-admin user deletion.
        """
        reassignments = [
            (TreatmentGoal, "created_by_id"),
            # organizations app
            (Organization, "created_by_id"),
            # datasets app
            (Dataset, "created_by_id"),
            (Category, "created_by_id"),
            (Style, "created_by_id"),
            (DataLayer, "created_by_id"),
        ]

        for model, field in reassignments:
            table = model._meta.db_table
            label = f"{model.__name__}.{field}"
            where = f"{field} != %s"
            if dry_run:
                count = self._count(table, where, [admin.pk])
                self.stdout.write(
                    f"[dry-run] Would reassign {count} {label} record(s) to admin."
                )
            else:
                count = self._update(
                    table, f"{field} = %s", where, [admin.pk, admin.pk]
                )
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Reassigned {count} {label} record(s) to admin."
                    )
                )

    def _delete_records(self, dry_run, admin):
        # Ordered to respect FK constraints — dependents before their parents.
        steps = [
            (UserPrefs, None, None),
            (SharedLink, None, None),
            (UserObjectRole, None, None),
            (PlanningAreaNote, None, None),
            (ProjectAreaNote, None, None),
            (TreatmentPlanNote, None, None),
            # RESTRICT FK on TreatmentPlan + ProjectArea
            (TreatmentPrescription, None, None),
            # RESTRICT FK on TreatmentPlan
            (TreatmentResult, None, None),
            (ProjectAreaTreatmentResult, None, None),
            # RESTRICT FK on Scenario
            (ProjectArea, None, None),
            # RESTRICT FK on Scenario
            (TreatmentPlan, None, None),
            (ScenarioResult, None, None),
            (Scenario, None, None),
            # climate_foresight — all depend on ClimateForesightRun (CASCADE)
            # ClimateForesightPillarRollup also has CASCADE FK on Pillar → must precede Pillar
            (ClimateForesightPillarRollup, None, None),
            # ClimateForesightRunInputDataLayer has CASCADE FK on Run, SET_NULL on Pillar
            (ClimateForesightRunInputDataLayer, None, None),
            # These two are OneToOne CASCADE on Run
            (ClimateForesightLandscapeRollup, None, None),
            (ClimateForesightPromote, None, None),
            # Pillar has CASCADE FK on Run (null=True for global pillars)
            (ClimateForesightPillar, None, None),
            (ClimateForesightRun, None, None),
            # PlanningArea last among content — cascades Scenario and ClimateForesightRun
            (PlanningArea, None, None),
            # auth user↔permission and user↔group assignments (not the definitions)
            (AuthUser.user_permissions.through, "user_id != %s", [admin.pk]),
            (AuthUser.groups.through, "user_id != %s", [admin.pk]),
            # django admin log — must precede user deletion
            (LogEntry, None, None),
            # password_policies — must precede user deletion
            (PasswordRecord, None, None),
            # allauth — must precede user deletion
            (EmailConfirmation, None, None),
            (EmailAddress, None, None),
            (SocialToken, None, None),
            (SocialAccount, None, None),
            # Delete all users except admin
            (User, "id != %s", [admin.pk]),
        ]

        for model, where, params in steps:
            table = model._meta.db_table
            label = model.__name__
            if dry_run:
                count = self._count(table, where or "", params)
                self.stdout.write(f"[dry-run] Would delete {count} {label} record(s).")
            else:
                count = self._delete(table, where or "", params)
                self.stdout.write(
                    self.style.SUCCESS(f"Deleted {count} {label} record(s).")
                )

    def handle(self, **options):
        if settings.ENV == "production":
            raise SystemExit(
                "\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
                "!! DANGER: This command cannot run in production.     !!\n"
                "!! It permanently deletes all user PII from the DB.  !!\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
            )

        dry_run = options["dry_run"]
        admin = self._get_or_create_admin()

        self.stdout.write("\n-- Reassigning created_by fields to admin --")
        self._reassign_created_by(admin, dry_run)

        self.stdout.write("\n-- Deleting PII records --")
        self._delete_records(dry_run, admin)
