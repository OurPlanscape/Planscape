import argparse
from datetime import datetime
from django.db import transaction
import json
import logging
import random
import time

from django.core.management.base import BaseCommand, CommandParser
from planning.models import (Scenario, ScenarioResultStatus, ScenarioResult)

#TODO: Move evaluate_scenario() outside of the command directory.

class Command(BaseCommand):
    help = "Evaluates a specific scenario."

    # TODO: configure a dedicated logger in settings.py for this command.
    logger = logging.getLogger(__name__)

    def add_arguments(self, parser):
        parser.add_argument("scenario_id", type=int)
        parser.add_argument('--dry_run',
                            type=bool, default=False, action=argparse.BooleanOptionalAction,
                            help='Show the commands to be run but do not run them.' \
                                 'Makes no changes to the database and does not call forsys.')
        parser.add_argument('--fake_run',
                            type=bool, default=False, action=argparse.BooleanOptionalAction,
                            help='Fake an evaluation and write dummy data for a scenario.')
        parser.add_argument('--fake_run_time', type=int, default=60, required=False,
                            help='Sets the run duration in seconds for a fake run')
        parser.add_argument('--fake_run_failure_rate', type=int, default=0, required=False,
                            help='During a fake run, set the failure rate (0-100).')

    def handle(self, *args, **options):
        scenario_id = options["scenario_id"]
        dry_run = options['dry_run']
        fake_run = options['fake_run']
        fake_run_time = options['fake_run_time']
        fake_run_failure_rate = options['fake_run_failure_rate']

        try:
            self.evaluate_scenario(scenario_id, dry_run, fake_run, fake_run_time,
                                   fake_run_failure_rate)
            self.logger.info('Successfully evaluated scenario %d' % scenario_id)
        except Exception as e:
            # Log any exception, but then throw it again to generate a failed exit code.
            self.logger.critical(str(e))
            raise e

    def _evaluate_fake(self, scenario: Scenario, scenario_result: ScenarioResult,
                       dry_run: bool, fake_run_time: int, fake_run_failure_rate: int):
        """
        Fakes a scenario evaluation.
        Allows for a chance of a simulated failure.
        """
        self.logger.debug("Fake-evaluating %d" % scenario.pk)
        scenario_result.status = ScenarioResultStatus.RUNNING
        scenario_result.save()
        time.sleep(fake_run_time)
        self.logger.debug("sleeping %d" % fake_run_time)

        if fake_run_failure_rate > 0:
            random.seed()
            if random.randrange(100) < fake_run_failure_rate:
                self.logger.info("faking a failure")
                return {
                    'new_status': ScenarioResultStatus.FAILURE,
                    'new_result': {
                        'comment': 'Inconcievable!'
                    },
                    'new_run_details': {
                        'comment': 'You’ve fell victim to one of the classic blunders! '\
                                   'The most famous is never get involved in a land war in Asia, '\
                                   'but only slightly less well known is this; never go in '\
                                   'against a Sicilian, when death is on the line!'
                    }
                }

        return {
            'new_status': ScenarioResultStatus.SUCCESS,
            'new_result': {
                'comment': "We'll never succeed."
            },
            'new_run_details': {
                'comment': "No, no. We have already succeeded. I mean, what are the three terrors "\
                           "of the Fire Swamp? One, the flame spurt — no problem. There's a "\
                           "popping sound preceding each; we can avoid that. Two, the lightning "\
                           "sand, which you were clever enough to discover what that looks like, "\
                           "so in the future we can avoid that too."
            }
        }

    def _evaluate_scenario(self, scenario: Scenario, scenario_results: ScenarioResult,
                           dry_run: bool):
        """
        TODO: Read all map data for scenario from DB
        Run Forsys
        Write full results (e.g. project areas) to DB
        """

        self._run_forsys()

        return {
            'new_status': ScenarioResultStatus.SUCCESS,
            'new_result': {
                'comment': 'TODO'
            },
            'new_run_details': {
                'comment': 'TODO'
            }
        }

    def evaluate_scenario(self, scenario_id: int, dry_run: bool, fake_run: bool,
                          fake_run_time: int, fake_run_failure_rate: int):
        scenario_result = ScenarioResult.objects.filter(
            status=ScenarioResultStatus.PENDING).select_related('scenario').get(scenario__pk=scenario_id)
        scenario = Scenario.objects.select_related('planning_area').get(id=scenario_id)

        if scenario_result is None:
            self.logger.debug('Scenarios need to be in a PENDING state in order to be evaluated.')
            raise ValueError("No eligible scenario found")

        # TODO: Make a real class out of the output instead of toting around dictionaries
        run_output = {}
        run_starting_time = datetime.now()
        output_start_time = run_starting_time.strftime("%x %X")

        with transaction.atomic():
            scenario_result.status = ScenarioResultStatus.RUNNING
            scenario_result.run_details = json.dumps({'start_time': output_start_time})
            scenario_result.save()

            if fake_run:
                run_output = self._evaluate_fake(scenario, scenario_result, dry_run, fake_run_time,
                                                 fake_run_failure_rate)
            else:
                try:
                    run_output = self._evaluate_scenario(scenario, scenario_result, dry_run)
                    #TODO: Save project areas to DB, etc.
                except Exception as e:
                    run_output['new_status'] = ScenarioResultStatus.FAILURE
                    run_output['new_run_details']['error_details'] = str(e)

            run_output['new_run_details']['start_time'] = output_start_time
            run_ending_time = datetime.now()
            elapsed_time = run_ending_time - run_starting_time
            run_output['new_run_details']['end_time'] = run_ending_time.strftime("%x %X")
            run_output['new_run_details']['elapsed_time'] = elapsed_time.total_seconds()

            scenario_result.status = run_output['new_status']
            scenario_result.result = json.dumps(run_output['new_result'])
            scenario_result.run_details = json.dumps(run_output['new_run_details'])
            scenario_result.save()

            if dry_run:
                self.logger.info(json.dumps(run_output))
                transaction.set_rollback(True)
            else:
                self.logger.debug(json.dumps(run_output))
        return True

    def _run_forsys(self):
        """
        This is where the fun happens.
        """
        pass
