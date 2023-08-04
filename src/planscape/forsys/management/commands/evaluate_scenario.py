import argparse

from django.core.management.base import BaseCommand, CommandError

class Command(BaseCommand):
    help = "Evaluates a specific scenario."

    def add_arguments(self, parser):
        parser.add_argument("scenario_id", type=int)
        parser.add_argument('--dry_run',
                            type=bool, default=True, action=argparse.BooleanOptionalAction,
                            help='Show the commands to be run but do not run them.')

    def handle(self, *args, **options):
        scenario_id = options["scenario_id"]

        self._evaluate_scenario(scenario_id)
        self.stdout.write(
            self.style.SUCCESS('Successfully evaluated "%d"' % scenario_id)
        )

    def _evaluate_scenario(self, scenario_id: int):
                
        """
        TODO:
        Read from DB
        Write faked result to DB
        Sanity-check scenario correctness
        
        Update DB with run information (pid, start time)
        Run Forsys
        Write to DB

        """
        return True
