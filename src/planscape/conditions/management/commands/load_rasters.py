from django.core.management.base import BaseCommand, CommandParser
from conditions.models import Condition
from conditions.registry import register_condition_raster


class Command(BaseCommand):
    help = "Loads rasters based on conditions existing in the database."

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
            help="If set to false, the command will not remove previous raster data from each condition from the raster table."
        )

    def handle(self, *args, **options):
        condition_ids = options.get("condition_ids")
        clear = options.get("clear")
        if condition_ids:
            conditions = Condition.objects.filter(id__in=condition_ids)
        else:
            conditions = Condition.objects.all()

        results = list([self.handle_condition(condition, clear) for condition in conditions])
        total = len(results)
        success = len([result for result in results if result[0]])
        failure = total - success

        self.stdout.write(f"Condition Rasters Loaded: {success}.\n"
                          f"Condition Rasters Failed: {failure}")
        
    def handle_condition(self, condition, clear=True):
        result = register_condition_raster(condition, clear=clear)
        message = f"[OK] Condition Raster Loaded: {condition.pk}.\n" if result[0] else f"[FAIL] Condition Raster Failed: {result[1]}"
        self.stdout.write(message)
        return result
        

