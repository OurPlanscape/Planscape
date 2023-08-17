import json
import os
from pathlib import Path
import subprocess
from django.conf import settings
from django.core.management.base import BaseCommand, CommandParser
from django.db import transaction
from base.condition_types import ConditionLevel, ConditionScoreType
from conditions.models import BaseCondition, Condition, ConditionRaster
from utils.cli import psql, psql_pipe, raster2pgpsql


class Command(BaseCommand):
    help = "Loads conditions from 'conditions.json' into the database."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--conditions-file",
            type=str,
            default=str(settings.DEFAULT_CONDITIONS_FILE),
        )

        parser.add_argument(
            "--dry-run",
            default=False,
            action="store_true",
            help="Configures if this is a dry-run. If true, no changes will be persisted.",
        )

    def handle(self, *args, **options):
        conditions_file = options["conditions_file"]
        path = Path(conditions_file)
        if not path.exists():
            self.stderr.write(f"Conditions file {conditions_file} does not exist")
            return

        with open(conditions_file) as f:
            conditions = json.load(f)

            with transaction.atomic():
                metrics = self.get_metrics(conditions["regions"])

                conditions = list([
                    self.process_metric(metric) for metric in metrics
                ])
                total = len(conditions)
                success = len([condition for condition in conditions if condition])
                failure = total - success

                self.stdout.write(f"Conditions Loaded: {success}.\n"
                                  f"Conditions Failed: {failure}")

                if options["dry_run"]:
                    transaction.set_rollback(True)

    def get_metrics(self, regions):
        regions = (region for region in regions)
        pillars = self.flatten_inner(regions, "pillars")
        elements = self.flatten_inner(pillars, "elements")
        metrics = self.flatten_inner(elements, "metrics")
        return metrics

    def flatten_inner(self, parents, key):
        for parent in parents:
            children = parent.pop(key)
            for child in children:
                yield {**parent, **child}


    def process_metric(self, metric):
        # if we start to use normalized metrics again
        # we will need to change this code to stop
        # using hardcoded level, score type and is_raw
        base_condition, _created = BaseCondition.objects.update_or_create(
            condition_name=metric["metric_name"],
            display_name=metric["display_name"],
            region_name=metric["region_name"],
            condition_level=ConditionLevel.METRIC,
        )
        # FIXME: if we ever start using normalized metrics again we need to change this
        # to read from the conditions.json file
        score_type = ConditionScoreType.CURRENT
        raw = True

        raster_name = metric["raw_data_download_path"]

        condition, _created = Condition.objects.update_or_create(
            condition_dataset=base_condition,
            raster_name=raster_name,
            condition_score_type=score_type,
            is_raw=raw,
        )
        
        self.stdout.write(
            f"[OK] {metric['region_name']}:{metric['metric_name']}"
        )

        return condition
