""" Class for parsing, validating, and accessing components in the treatment goals configuration file.

"""
import json

from base.region_name import RegionName


class TreatmentGoalsConfig:
    """
    Class wrapping the configuration of treatment goals.
    """

    def __init__(self, filename: str):
        with open(filename, "r") as stream:
            try:
                self._config = json.load(stream)
            except json.JSONDecodeError as exc:
                raise ValueError("Could not parse JSON file; exception was " + str(exc))
            if not self.check_config():
                raise ValueError("Illegal structure in JSON configuration.")

    def check_config(self) -> bool:
        """Checks the structure of the configuration.
        Returns:
            True if the configuration matches the right structure.
        """

        def check_regions(regionlist) -> bool:
            return isinstance(regionlist, list) and all(
                [check_region(region) for region in regionlist]
            )

        def check_region(region) -> bool:
            return (
                isinstance(region, dict)
                and region.keys() <= set(["region_name", "treatment_goals"])
                and isinstance(region["region_name"], str)
                and isinstance(region["treatment_goals"], list)
                and check_treatment_goals(region["treatment_goals"])
            )

        def check_treatment_goals(treatment_goals_list) -> bool:
            return isinstance(treatment_goals_list, list) and all(
                [
                    check_treatment_goal(treatment_goal)
                    for treatment_goal in treatment_goals_list
                ]
            )

        def check_treatment_goal(treatment_goal) -> bool:
            return (
                isinstance(treatment_goal, dict)
                and treatment_goal.keys() <= set(["category_name", "questions"])
                and isinstance(treatment_goal["category_name"], str)
                and isinstance(treatment_goal["questions"], list)
                and all(
                    [
                        check_treatment_question(treatment_question)
                        for treatment_question in treatment_goal["questions"]
                    ]
                )
            )

        def check_treatment_question(treatment_question) -> bool:
            return (
                isinstance(treatment_question, dict)
                and treatment_question.keys()
                <= set(
                    [
                        "short_question_text",
                        "long_question_text",
                        "scenario_priorities",
                        "weights",
                        "scenario_output_fields_paths",
                        "stand_thresholds",
                        "global_thresholds",
                    ]
                )
                and isinstance(treatment_question["short_question_text"], str)
                and isinstance(treatment_question["long_question_text"], str)
                and isinstance(treatment_question["scenario_priorities"], list)
                and isinstance(treatment_question["weights"], list)
                and isinstance(treatment_question["scenario_output_fields_paths"], dict)
                and isinstance(treatment_question["stand_thresholds"], list)
                and isinstance(treatment_question["global_thresholds"], list)
            )

        return "regions" in self._config and check_regions(self._config["regions"])
