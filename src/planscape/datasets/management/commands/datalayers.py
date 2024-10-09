from pprint import pprint
from django.core.management.base import CommandParser
import requests
from core.base_commands import PlanscapeCommand


class Command(PlanscapeCommand):
    entity = "DataLayers"

    def add_subcommands(self, parser: CommandParser) -> None:
        parser.add_argument(
            "subcommand",
            type=str,
            choices=[
                "list",
                "detail",
                "create",
            ],
        )

    def list(self, token, **kwargs):
        base_url = self.get_base_url(**kwargs)
        list_url = base_url + "/v2/planningareas"
        headers = self.get_headers(token, **kwargs)
        response = requests.get(
            list_url,
            headers=headers,
        )
        data = response.json()
        self.stdout.write(f"Found {data['count']} {self.entity}:")
        pprint(data)
