import argparse
import json
import logging
import random
import time

from datetime import datetime
from django.core.management.base import BaseCommand
from django.db import transaction

from planning.models import (Scenario, ScenarioResultStatus, ScenarioResult)

def run_scenario(scenario_id: int, dry_run: bool, fake_run: bool,
                 fake_run_time: int, fake_run_failure_rate: int):
    logger = logging.getLogger(__name__)
    scenario_result = ScenarioResult.objects.filter(
        status=ScenarioResultStatus.PENDING).select_related('scenario').get(scenario__pk=scenario_id)
    scenario = Scenario.objects.select_related('planning_area').get(id=scenario_id)

    if scenario_result is None:
        raise ValueError("No eligible scenario (e.g. in a PENDING state) found")

    # TODO: Make a real class out of the output instead of toting around dictionaries
    run_output = {}
    run_starting_time = datetime.now()
    output_start_time = run_starting_time.strftime("%x %X")

    with transaction.atomic():
        scenario_result.status = ScenarioResultStatus.RUNNING
        scenario_result.run_details = json.dumps({'start_time': output_start_time})
        scenario_result.save()

        if fake_run:
            run_output = _run_fake_scenario(scenario, scenario_result, dry_run, fake_run_time,
                                            fake_run_failure_rate)
        else:
            try:
                run_output = _run_scenario(scenario, scenario_result, dry_run)
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
            logger.info(json.dumps(run_output))
            transaction.set_rollback(True)
        else:
            logger.debug(json.dumps(run_output))


def _run_scenario(scenario: Scenario, scenario_results: ScenarioResult,
                      dry_run: bool):
    """
    TODO: Read all map data for scenario from DB
    Run Forsys
    Write full results (e.g. project areas) to DB
    """

    # TODO: Run forsys here.

    return {
        'new_status': ScenarioResultStatus.SUCCESS,
        'new_result': {
            'comment': 'TODO'
        },
        'new_run_details': {
            'comment': 'TODO'
        }
    }


def _run_fake_scenario(scenario: Scenario, scenario_result: ScenarioResult,
                       dry_run: bool, fake_run_time: int, fake_run_failure_rate: int):
    """
    Fakes a scenario evaluation.
    Allows for a chance of a simulated failure.
    Should return the same information that process_scenario does.
    """

    logger = logging.getLogger(__name__)
    logger.debug("Fake-evaluating %d" % scenario.pk)
    scenario_result.status = ScenarioResultStatus.RUNNING
    scenario_result.save()
    time.sleep(fake_run_time)
    logger.debug("sleeping %d" % fake_run_time)

    if fake_run_failure_rate > 0:
        random.seed()
        if random.randrange(100) < fake_run_failure_rate:
            logger.info("faking a failure")
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

