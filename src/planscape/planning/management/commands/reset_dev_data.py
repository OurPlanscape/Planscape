from django.core.management.base import BaseCommand, CommandError
from django.conf import settings

from datasets.models import Dataset, DataLayer, Category
from organizations.models import Organization
from planning.models import TreatmentGoal, TreatmentGoalUsesDataLayer


class Command(BaseCommand):
    help = "Deletes development-only data for specific models across planning, datasets, and organizations apps."

    def handle(self, *args, **kwargs):
        if settings.ENV == "local":
            TreatmentGoalUsesDataLayer.objects.all().delete()
            TreatmentGoal.objects.all().delete()
            DataLayer.objects.all().delete()
            Category.objects.all().delete()
            Dataset.objects.all().delete()
        else:
            raise CommandError(
                f"This command can only be run in local environment. Current ENV={settings.ENV}"
            )
