from pprint import pprint
from typing import Optional
from django.core.management.base import CommandParser
import requests
from core.base_commands import PlanscapeCommand


class Command(PlanscapeCommand):
    entity = "DataLayers"

    def add_subcommands(self, parser: CommandParser) -> None:
        subp = parser.add_subparsers()
        list_parser = subp.add_parser("list")
        create_parser = subp.add_parser("create")
        create_parser.add_argument("name", type=str)
        create_parser.add_argument(
            "--dataset",
            type=int,
            required=True,
        )
        create_parser.add_argument("--input_file", type=str, required=False)
        list_parser.set_defaults(func=self.list)
        create_parser.set_defaults(func=self.create)

    def list(self, token, **kwargs):
        base_url = self.get_base_url(**kwargs)
        list_url = base_url + "/v2/datalayers"
        headers = self.get_headers(token, **kwargs)
        response = requests.get(
            list_url,
            headers=headers,
        )
        data = response.json()
        self.stdout.write(f"Found {data['count']} {self.entity}:")
        pprint(data)

    def create(self, name: str, dataset: int, **kwargs) -> None:
        base_url = self.get_base_url(**kwargs)
        url = base_url + "/v2/datalayers/"
        headers = self.get_headers(**kwargs)
        input_data = {
            "organization": kwargs.get("org"),
            "name": name,
            "dataset": dataset,
        }
        response = requests.post(
            url,
            headers=headers,
            data=input_data,
        )
        output_data = response.json()
        pprint(output_data)
