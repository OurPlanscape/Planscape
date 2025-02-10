from django.core.management.base import BaseCommand, CommandParser

from restrictions.loader import MAPPINGS, load_data
from restrictions.models import Restriction


class Command(BaseCommand):
    help = "Loads restrictions data."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--type",
            type=str,
        )

        parser.add_argument(
            "--input-file",
            type=str,
        )

        parser.add_argument(
            "--clear",
            default=True,
            action="store_true",
            help="If set to false, the command will not remove previous restrictions data.",
        )

        parser.add_argument(
            "--validate",
            default=True,
            action="store_true",
            help="if set to false, the command will not validate the data",
        )

    def clear(self, type):
        counts = Restriction.objects.filter(type=type).delete()
        self.stdout.write(f"Deleted {counts} for {type}")

    def handle(self, *args, **options):
        type = options.get("type")
        input_file = options.get("input_file")
        clear = options.get("clear")
        if type not in list(MAPPINGS.keys()):
            self.stderr.write("INVALID TYPE")
            return

        if clear:
            self.clear(type)

        load_data(
            input_file,
            MAPPINGS[type],
            type,
        )
