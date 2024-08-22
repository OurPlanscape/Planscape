from pathlib import Path
from typing import List, Tuple, Union

from django.core.management.base import BaseCommand
from django.db import connection

from utils.file_utils import read_file


TInput = Union[Path, str]
TResult = Tuple[bool, TInput]


class Command(BaseCommand):
    help = "Installs all custom plpgsql functions used to generate layers"

    def add_arguments(self, parser) -> None:
        parser.add_argument("--folder", type=str, default=None)
        parser.add_argument("--uninstall", action="store_true", default=False)

    def default_folder(self) -> Path:
        return Path("martin/sql")

    def get_uninstall_sql(self, file: TInput) -> str:
        filepath = Path(file)
        return f"DROP FUNCTION IF EXISTS {filepath.stem};"

    def uninstall(self, file: TInput) -> TResult:
        try:
            with connection.cursor() as cursor:
                cursor.execute(self.get_uninstall_sql(file))
                return (True, file)
        except Exception:
            return (False, file)

    def install(self, file: TInput) -> TResult:
        try:
            with connection.cursor() as cursor:
                cursor.execute(file.read_text())
                return (True, file)
        except Exception:
            return (False, file)

    def handle(self, *args, **options):
        folder = Path(
            options.get("folder", self.default_folder()) or self.default_folder()
        )
        files = list(folder.glob("*.sql"))
        self.stdout.write("The following layers were found:")
        for f in files:
            self.stdout.write(f"{f} found")
        is_installation = not options.get("uninstall", False) or False
        fn = self.install if is_installation else self.uninstall
        results = list([fn(f) for f in files])
        for result in results:
            self.report_result(result, is_installation)

    def report_result(self, result: TResult, is_installation: bool = False) -> None:
        success, file = result
        fn = self.stdout.write if success else self.stderr.write
        indicator1 = "succeeded" if success else "failed"
        indicator2 = "[OK]" if success else "[FAIL]"
        verb = "installation" if is_installation else "deletion"
        fn(f"{indicator2} {file} {verb} {indicator1}")
