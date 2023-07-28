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
                raise ValueError(
                    "Could not parse JSON file; exception was " + str(exc))
            if not self.check_config():
                raise ValueError("Illegal structure in JSON configuration.")

    def check_config(self) -> bool:
        """Checks the structure of the configuration.
        Returns:
            True if the configuration matches the right structure.
        """


        def check_treatment_goals(treatment_goals_list) -> bool:
            return (isinstance(treatment_goals_list, list) and
                    all([check_treatment_goal(treatment_goal) for treatment_goal in treatment_goals_list]))


        def check_treatment_goal(treatment_goal) -> bool:
            return (isinstance(treatment_goal, dict) and
                    treatment_goal.keys() <= set(['category_name', 'questions']) and
                    isinstance(treatment_goal['category_name'], str) and
                    isinstance(treatment_goal['questions'], list) and
                    all([check_treatment_question(treatment_question) for treatment_question in treatment_goal['questions']]))
        
        def check_treatment_question(treatment_question) -> bool:
            return (isinstance(treatment_question, dict) and
                    treatment_question.keys() <= set(['question_text', 'priorities', 'weights']) and
                    isinstance(treatment_question['question_text'], str) and
                    isinstance(treatment_question['priorities'], list) and
                    isinstance(treatment_question['weights'], list))


        return 'treatment_goals' in self._config and check_treatment_goals(self._config['treatment_goals'])
