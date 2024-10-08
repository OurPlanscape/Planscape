from pprint import pprint
from typing import Any, Dict, Tuple
from django.core.management.base import BaseCommand, CommandParser
import requests
from utils.cli_utils import options_from_file


class Command(BaseCommand):
    entity = "DataLayers"

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "subcommand",
            type=str,
            choices=[
                "list",
                "detail",
                "create",
            ],
        )
        parser.add_argument("--email", type=str)
        parser.add_argument("--password", type=str)
        parser.add_argument("--org", type=str)
        parser.add_argument(
            "--env",
            type=str,
            choices=[
                "dev",
                "staging",
                "app",
            ],
        )

    def get_base_url(self, **kwargs):
        env = kwargs.get("env", "dev") or "dev"
        return f"https://{env}.planscape.org/planscape-backend/"

    def get_token(self, email, password, options) -> str:
        base_url = self.get_base_url(**options)
        login_url = base_url + "dj-rest-auth/login/"
        data = {"email": email, "password": password}
        response = requests.post(
            login_url,
            data=data,
        )
        out_data = response.json()
        return out_data["access"]

    def get_headers(self, token, **kwargs):
        return {"Authorization": f"Bearer {token}"}

    def validate_options(
        self, cli_options, file_options
    ) -> Tuple[bool, Dict[str, Any]]:
        options = {
            **cli_options,
            **file_options,
        }

        if "org" not in options:
            self.stderr.write(
                "Org argument is mandatory. Add it to the CLI arguments or add it to `.planconfig` file."
            )
            return False, options
        org = options.get("org")
        if not org:
            self.stderr.write(
                "org argument is mandatory and it is null or blank. Add it to the CLI arguments or add it to `.planconfig` file."
            )
            return False, options

        email = options.get("email")
        password = options.get("password")

        if not email or not password:
            self.stderr.write("You need to inform email and password.")
            return False, options

        return True, options

    def handle(self, *args, **options):
        file_options = options_from_file()
        is_valid, cli_options = self.validate_options(
            cli_options=options, file_options=file_options
        )
        email = cli_options.get("email")
        password = cli_options.get("password")
        if not is_valid:
            self.stderr.write("Invalid options.")

        token = self.get_token(email, password, options)
        if not token:
            self.stderr.write("Could not fetch token.")
            return

        options = {**cli_options, "token": token}

        subcommand = getattr(self, cli_options.get("subcommand", "list") or "list")
        subcommand(**options)

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
