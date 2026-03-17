from climate_foresight.models import ClimateForesightPillar, ClimateForesightRun
from collaboration.models import UserObjectRole
from django.conf import settings
from datasets.models import Category, DataLayer, Dataset, Style
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from impacts.models import (
    ProjectAreaTreatmentResult,
    TreatmentPlan,
    TreatmentPlanNote,
    TreatmentPrescription,
    TreatmentResult,
)
from organizations.models import Organization
from planning.models import (
    PlanningArea,
    PlanningAreaNote,
    ProjectArea,
    ProjectAreaNote,
    Scenario,
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

    def _reassign_created_by(self, admin, dry_run):
        """
        Reassign created_by (and updated_by) on all models that carry those fields
        to the admin user. This ensures Organization integrity is preserved and that
        RESTRICT constraints do not block non-admin user deletion.
        """
        reassignments = [
            ("Organization.created_by", Organization.objects.exclude(created_by=admin)),
            ("Dataset.created_by", Dataset.objects.exclude(created_by=admin)),
            ("Category.created_by", Category.objects.exclude(created_by=admin)),
            ("Style.created_by", Style.objects.exclude(created_by=admin)),
            ("DataLayer.created_by", DataLayer.objects.exclude(created_by=admin)),
        ]

        for label, qs in reassignments:
            count = qs.count()
            field = label.split(".")[-1]
            if dry_run:
                self.stdout.write(
                    f"[dry-run] Would reassign {count} {label} record(s) to admin."
                )
            else:
                qs.update(**{field: admin})
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Reassigned {count} {label} record(s) to admin."
                    )
                )

    def _delete_records(self, dry_run, admin):
        # Ordered to respect RESTRICT FK constraints — dependents first.
        steps = [
            ("UserPrefs", UserPrefs.objects.all()),
            ("SharedLink", SharedLink.objects.all()),
            ("UserObjectRole", UserObjectRole.objects.all()),
            ("PlanningAreaNote", PlanningAreaNote.objects.all()),
            ("ProjectAreaNote", ProjectAreaNote.objects.all()),
            ("TreatmentPlanNote", TreatmentPlanNote.objects.all()),
            # RESTRICT FK on TreatmentPlan + ProjectArea
            ("TreatmentPrescription", TreatmentPrescription.objects.all()),
            # RESTRICT FK on TreatmentPlan
            ("TreatmentResult", TreatmentResult.objects.all()),
            ("ProjectAreaTreatmentResult", ProjectAreaTreatmentResult.objects.all()),
            # RESTRICT FK on Scenario
            ("ProjectArea", ProjectArea.objects.all()),
            # RESTRICT FK on Scenario
            ("TreatmentPlan", TreatmentPlan.objects.all()),
            ("TreatmentGoal", TreatmentGoal.objects.all()),
            # Cascades ClimateForesightRun/Pillar via PlanningArea → Scenario
            ("Scenario", Scenario.objects.all()),
            # climate_foresight — FK to PlanningArea (CASCADE) and created_by (CASCADE)
            ("ClimateForesightPillar", ClimateForesightPillar.objects.all()),
            ("ClimateForesightRun", ClimateForesightRun.objects.all()),
            # Cascades Scenario
            ("PlanningArea", PlanningArea.objects.all()),
            # Delete all users except admin
            ("User", User.objects.exclude(pk=admin.pk)),
        ]

        for label, qs in steps:
            count = qs.count()
            if dry_run:
                self.stdout.write(f"[dry-run] Would delete {count} {label} record(s).")
            else:
                qs.delete()
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
