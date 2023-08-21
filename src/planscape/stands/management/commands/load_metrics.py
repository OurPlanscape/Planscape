from django.core.management.base import BaseCommand, CommandParser
from conditions.models import Condition
from django.db import connection


class Command(BaseCommand):
    help = "Loads stand metrics based on conditions existing in the database."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--condition-ids",
            nargs="+",
            type=int,
        )

        parser.add_argument(
            "--clear",
            default=True,
            action="store_true",
            help="If set to false, the command will not remove previous metrics data from each condition from the raster table.",
        )

    def handle(self, *args, **options):
        condition_ids = options.get("condition_ids")
        clear = options.get("clear")
        if condition_ids:
            conditions = Condition.objects.filter(id__in=condition_ids)
        else:
            conditions = Condition.objects.all()

        results = list(
            [self.handle_condition(condition, clear) for condition in conditions]
        )
        total = len(results)
        success = len([result for result in results if result[0]])
        failure = total - success

        self.stdout.write(
            f"Stand Metrics Loaded: {success}.\nStand Metrics Failed: {failure}"
        )

    def handle_condition(self, condition, clear=True):
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT * FROM generate_stand_metrics(%s, %s)",
                    [condition.pk, clear],
                )
                self.stdout.write(f"[OK] Generated metrics for {condition.pk}")
                return (True, condition)
        except Exception as ex:
            self.stderr.write(
                f"[FAIL] Something went wrong while generating stand metrics {str(ex)}."
            )
            return (False, condition)
