import json
from typing import Any, Dict

import requests
from core.base_commands import PlanscapeCommand
from core.pprint import pprint
from django.core.management.base import CommandParser


class Command(PlanscapeCommand):
    entity = "Styles"

    def add_subcommands(self, parser: CommandParser) -> None:
        subp = parser.add_subparsers()

        list_parser = subp.add_parser("list")
        create_parser = subp.add_parser("create")
        import_parser = subp.add_parser("import")

        create_parser.add_argument("name", type=str)
        create_parser.add_argument("type", type=str)
        create_parser.add_argument(
            "--data",
            required=False,
            type=json.loads,
        )

        import_parser.add_argument(
            "--directory",
            required=True,
            type=str,
            help="Path to the directory containing style JSON files to be imported",
        )
        import_parser.add_argument(
            "--dry-run",
            required=False,
            action="store_true",
            default=False,
            help="If set, validate the JSON files without creating styles.",
        )

        list_parser.set_defaults(func=self.list)
        create_parser.set_defaults(func=self.create)
        import_parser.set_defaults(func=self.import_styles)

    def list(self, token, **kwargs):
        base_url = self.get_base_url(**kwargs)
        list_url = base_url + "/v2/admin/styles"
        headers = self.get_headers(token, **kwargs)
        response = requests.get(
            list_url,
            headers=headers,
        )
        data = response.json()
        self.stdout.write(f"Found {data['count']} {self.entity}:")
        pprint(data)

    def create(
        self,
        name: str,
        type: str,
        data: Dict[str, Any],
        org: int,
        **kwargs,
    ) -> None:
        base_url = self.get_base_url(**kwargs)
        url = base_url + "/v2/admin/styles/"
        headers = self.get_headers(**kwargs)
        input_data = {
            "name": name,
            "type": type,
            "data": data,
            "organization": org,
        }
        response = requests.post(
            url,
            headers=headers,
            json=input_data,
        )
        output_data = response.json()
        pprint(output_data)

    def import_styles(self, directory: str, dry_run: bool = False, **kwargs):
        """
        Placeholder function for the 'import' command.
        Implementation of reading the directory, validating JSON files,
        and creating and associating styles will be a second PR.
        """
        self.stdout.write("Import subcommand called with:")
        self.stdout.write(f" - directory={directory}")
        self.stdout.write(f" - dry_run={dry_run}")
        self.stdout.write("Implementation is pending future PR.")
