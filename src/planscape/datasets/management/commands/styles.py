import json
from typing import Any, Dict

import requests
from core.base_commands import PlanscapeCommand
from core.pprint import pprint
from django.core.management.base import CommandParser
from pathlib import Path


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
        import_parser.add_argument(
            "--dataset_id",
            required=True,
            type=int,
            help="Fixed dataset ID to use when searching for matching datalayers",
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
        Reads all JSON files from the given directory, uses the base filename and a
        fixed dataset ID to search for matching datalayers, constructs a payload
        (including a 'datalayers' field if a match is found), and then:
         - In dry-run mode, prints the payload.
         - Otherwise, sends the payload to the style creation API endpoint.
         - Finally, reports the nubmer of file import successes and failures
        """
        base_url = self.get_base_url(**kwargs)
        headers = self.get_headers(**kwargs)

        fixed_dataset_id = kwargs.get("dataset_id")
        if not fixed_dataset_id:
            self.stderr.write("Error: No fixed dataset id provided in configuration.")
            return

        successes = []
        failures = []

        dir_path = Path(directory)
        for file_path in dir_path.glob("*.json"):
            try:
                with file_path.open("r", encoding="utf-8") as f:
                    style_data = json.load(f)
            except Exception as e:
                self.stderr.write(f"Failed to read {file_path}: {e}")
                continue

            base_name = file_path.stem

            datalayers_url = f"{base_url}/v2/admin/datalayers"
            query_params = {
                "original_name": base_name,
                "dataset": fixed_dataset_id,
            }
            dl_response = requests.get(
                datalayers_url, headers=headers, params=query_params
            )
            dl_data = dl_response.json()
            datalayer_ids = []
            if dl_data.get("count", 0) > 0:
                datalayer_ids.append(dl_data["results"][0]["id"])
            else:
                self.stderr.write(
                    f"WARNING: No matching datalayer found for style '{base_name}'. Continuing..."
                )

            map_type = style_data.get("map_type", None)
            RASTER_TYPES = ("RAMP", "INTERVALS", "VALUES")
            style_type = "RASTER" if map_type in RASTER_TYPES else "VECTOR"

            payload = {
                "name": base_name,
                "type": style_type,
                "data": style_data,
                "organization": kwargs.get("org"),
            }
            if datalayer_ids:
                payload["datalayers"] = datalayer_ids

            if dry_run:
                self.stdout.write(
                    f"Dry-run: would create style with payload: {json.dumps(payload, indent=2)}"
                )
                continue

            style_url = f"{base_url}/v2/admin/styles/"
            self.stdout.write(f"Sending payload:\n{json.dumps(payload, indent=2)}")
            response = requests.post(style_url, headers=headers, json=payload)
            result = response.json()
            if response.status_code == 201:
                self.stdout.write(
                    f"Created style from {file_path}: {json.dumps(result, indent=2)}"
                )
                successes.append(str(file_path))
            else:
                self.stderr.write(
                    f"ERROR creating style from {file_path}: {json.dumps(result, indent=2)}"
                )
                failures.append(str(file_path))

        self.stdout.write(
            f"Import complete: {len(successes)} successes, {len(failures)} failures."
        )
        if failures:
            self.stderr.write(f"Failed files: {', '.join(failures)}")
