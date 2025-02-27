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
        create_parser.add_argument("name", type=str)
        create_parser.add_argument("type", type=str)
        create_parser.add_argument(
            "--data",
            required=False,
            type=json.loads,
        )
        list_parser.set_defaults(func=self.list)
        create_parser.set_defaults(func=self.create)

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
