import csv
from collections import defaultdict
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError, CommandParser
from django.db import transaction

from datasets.models import DataLayer, SimpleCategory


def normalize(name: str) -> str:
    return " ".join(name.split()).casefold()


class Command(BaseCommand):
    help = (
        "Assigns simple categories to datalayers from a CSV, matching layers by name."
    )

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("csv_path", type=Path, help="Path to the CSV file.")
        parser.add_argument(
            "--name-column",
            default="Layer",
            help="Column holding the datalayer name.",
        )
        parser.add_argument(
            "--category-column",
            default="Category",
            help="Column holding the simple category name.",
        )
        parser.add_argument(
            "--dry-run",
            default=False,
            action="store_true",
            help="Report what would change without saving.",
        )

    def read_rows(self, path: Path, name_column: str, category_column: str):
        if not path.is_file():
            raise CommandError(f"File not found: {path}")
        with path.open(encoding="utf-8-sig", newline="") as fp:
            reader = csv.reader(fp)
            # the spreadsheet export may have extra rows above the header
            for header in reader:
                header = [column.strip() for column in header]
                if name_column in header and category_column in header:
                    break
            else:
                raise CommandError(
                    f"Header with columns '{name_column}' and '{category_column}' not found."
                )
            name_index = header.index(name_column)
            category_index = header.index(category_column)
            for row in reader:
                if len(row) <= max(name_index, category_index):
                    continue
                yield row[name_index].strip(), row[category_index].strip()

    def build_mapping(self, rows):
        categories_by_name = defaultdict(set)
        display_names = {}
        for name, category in rows:
            if not name or not category:
                continue
            key = normalize(name)
            categories_by_name[key].add(category)
            display_names.setdefault(key, name)

        mapping = {}
        for key, categories in categories_by_name.items():
            if len(categories) > 1:
                self.stderr.write(
                    f" [NOK] '{display_names[key]}' has conflicting categories {sorted(categories)}, skipping."
                )
                continue
            mapping[key] = categories.pop()
        return mapping, display_names

    def handle(self, *args, **options):
        dry_run: bool = options["dry_run"]
        rows = self.read_rows(
            options["csv_path"], options["name_column"], options["category_column"]
        )
        mapping, display_names = self.build_mapping(rows)
        if not mapping:
            self.stdout.write("No rows with a name and category found.")
            return

        with transaction.atomic():
            categories = {}
            for category_name in sorted(set(mapping.values())):
                category, created = SimpleCategory.objects.get_or_create(
                    name=category_name
                )
                if created:
                    self.stdout.write(
                        f" [OK] created simple category '{category_name}'."
                    )
                categories[category_name] = category

            matches = defaultdict(int)
            updated = 0
            for datalayer in DataLayer.objects.order_by("id").iterator():
                key = normalize(datalayer.name)
                if key not in mapping:
                    continue
                datalayer.simple_categories.set([categories[mapping[key]]])
                matches[key] += 1
                updated += 1
                self.stdout.write(
                    f" [OK] datalayer {datalayer.id} '{datalayer.name}' -> '{mapping[key]}'."
                )

            for key, count in sorted(matches.items()):
                if count > 1:
                    self.stdout.write(
                        f" [OK] '{display_names[key]}' matched {count} datalayers."
                    )
            unmatched = sorted(
                display_names[key] for key in mapping if key not in matches
            )
            for name in unmatched:
                self.stderr.write(f" [NOK] no datalayer named '{name}'.")

            if dry_run:
                transaction.set_rollback(True)

        prefix = "[DRY RUN] " if dry_run else ""
        self.stdout.write(
            f"{prefix}Finished. Updated {updated} datalayers, {len(unmatched)} names unmatched."
        )
