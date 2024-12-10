from pprint import pprint
from typing import Any, Dict, Optional, Tuple
from django.core.management.base import BaseCommand, CommandParser
import requests
from utils.cli_utils import options_from_file


class PlanscapeCommand(BaseCommand):
    """Custom Planscape command. This command
    will provide boilerplate code to handle
    talking to the planscape server and operating
    on it, with an admin user.
    """

    entity = "DataLayers"

    def add_subcommands(self, parser: CommandParser) -> None:
        """You can add subcommands here. You should use subparsers for this, like so:
        >>> subparsers = parser.add_subparsers()
        >>> subcommand = subparsers.add_parser("my_subcommand")
        >>> subcommand.add_argument("foo", type=str)
        >>> subcommand.set_defaults(func=self.foo)

        The code above demonstrates how to hook a function defined
        in this class to the subcommand, using the `set_defaults`
        method.

        This WILL NOT work without this. The `handle` django method
        will levarage this ArgParse machinery and without it, it will fail.
        """
        pass

    def add_arguments(self, parser: CommandParser) -> None:
        self.add_subcommands(parser)
        parser.add_argument("--email", type=str)
        parser.add_argument("--password", type=str)
        parser.add_argument("--org", type=int)
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
        breakpoint()
        return f"https://{env}.planscape.org/planscape-backend/"

    def get_token(self, email, password, options) -> Optional[str]:
        base_url = self.get_base_url(**options)
        login_url = base_url + "dj-rest-auth/login/"
        data = {"email": email, "password": password}
        response = requests.post(
            login_url,
            json=data,
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
        try:
            token = self.get_token(email, password, cli_options)
        except Exception:
            token = None

        if not token:
            self.stderr.write("Could not fetch token. Double check your credentials.")
            return

        ultimate_options = {**cli_options, "token": token}

        subcommand = options.get("func")
        if not subcommand:
            self.stderr.write(
                "CLI incorrectly configured. Check your parsers and subparsers!"
            )
            return
        subcommand(**ultimate_options)
