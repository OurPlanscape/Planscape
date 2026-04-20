from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from climate_foresight.models import ClimateForesightPillar


STANDARD_PILLARS = [
    {"name": "Air Quality", "order": 1},
    {"name": "Carbon Sequestration", "order": 2},
    {"name": "Fire-Adapted Communities", "order": 3},
    {"name": "Forest and Shrubland Resilience", "order": 4},
    {"name": "Water Security", "order": 5},
    {"name": "Biodiversity Conservation", "order": 6},
    {"name": "Economic Diversity", "order": 7},
    {"name": "Fire Dynamics", "order": 8},
    {"name": "Social and Cultural Well-Being", "order": 9},
    {"name": "Wetland Integrity", "order": 10},
]


class Command(BaseCommand):
    help = "Load the standard global Climate Foresight pillars"

    def add_arguments(self, parser):
        parser.add_argument(
            "--admin-email",
            default=settings.DEFAULT_ADMIN_EMAIL,
            help="Email of the user to assign as created_by",
        )

    def handle(self, *args, **options):
        admin_email = options["admin_email"]
        User = get_user_model()
        user = User.objects.filter(email=admin_email).first()

        if user is None:
            raise CommandError(f"No user found with email={admin_email}")

        created_count = 0
        existing_count = 0

        for pillar_data in STANDARD_PILLARS:
            _, created = ClimateForesightPillar.objects.get_or_create(
                name=pillar_data["name"],
                run=None,
                defaults={
                    "order": pillar_data["order"],
                    "created_by": user,
                    "created_at": timezone.now(),
                },
            )

            if created:
                created_count += 1
            else:
                existing_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                "Loaded standard pillars "
                f"(created={created_count}, existing={existing_count})"
            )
        )
