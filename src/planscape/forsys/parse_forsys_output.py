import rpy2

import numpy as np


class Scenario():
    # Priority weights for the scenario.
    priority_weights = {}
    # A list of the projects, ranked.
    ranked_projects = []
    # Given ranked projects, a cumulative sum of project area.
    cumulative_ranked_project_area = []
    # Given ranked projects, a cumulative sum of project cost.
    cumulative_ranked_project_cost = []

    # Converts a Scenario to a dictionary.
    # This facilitates JSON conversion.
    def to_dictionary(self) -> dict:
        output = {
            'priority_weights': self.priority_weights,
            'ranked_projects': [],
            'cumulative_ranked_project_area': [],
            'cumulative_ranked_project_cost': [],
        }
        for i in range(len(self.ranked_projects)):
            output['ranked_projects'].append(
                self.ranked_projects[i].to_dictionary())
            output['cumulative_ranked_project_area'].append(
                self.cumulative_ranked_project_area[i])
            output['cumulative_ranked_project_cost'].append(
                self.cumulative_ranked_project_cost[i])
        return output


class RankedProject():
    # Project ID.
    id = -1
    # Contribution of each priority to the total score
    # The contribution is weighted according to a scenario's priority weights.
    weighted_priority_scores = {}
    # The total score, summed across weighted priority scores.
    total_score = 0
    # Project rank.
    rank = -1

    # Converts a RankedProject to a dictionary.
    # This facilitates JSON conversion.
    def to_dictionary(self) -> dict:
        output = {
            'id': self.id,
            'weighted_priority_scores': self.weighted_priority_scores,
            'total_score': self.total_score,
            'rank': self.rank,
        }
        return output


# Transforms the output of a Forsys scenario set run into a more easily-interpreted version.
class ForsysScenarioSetOutput():
    scenarios = {}

    # Converts a ForsysScenarioSetOutput to a dictionary.
    # This facilitates JSON conversion.
    def to_dictionary(self) -> dict:
        output = {}
        for k in self.scenarios.keys():
            output[k] = self.scenarios[k].to_dictionary()
        return output

    # Initializes a ForsysScenarioSetOutput instance given raw forsys output, and the following inputs to the forsys call: header names, list of priorities.
    # Of note, priorities must be listed in the same order they're listed for the forsys call.
    def __init__(self, raw_forsys_output: "rpy2.robjects.vectors.ListVector", priorities: list[str], project_id_header: str, area_header: str, cost_header: str):
        self.scenarios = {}

        self.__save_raw_forsys_output_as_dict(raw_forsys_output)

        self.__set_header_names(priorities, area_header,
                                cost_header, project_id_header)

        for i in range(len(self.__forsys_output_dict[project_id_header])):
            scenario_weights, scenario_str = self.__get_scenario(i)

            if scenario_str in self.scenarios.keys():
                self.__append_project_to_existing_scenario(
                    scenario_str, scenario_weights, i)
            else:
                self.__append_project_to_new_scenario(
                    scenario_str, scenario_weights, i)

    # The raw forsys output consists of 3 R dataframes. This is the index of the "project output" dataframe.
    __PROJECT_OUTPUT_INDEX = 1
    # The priority weight header in the "project output" dataframe.
    __PRIORITY_WEIGHT_STRFORMAT = "Pr_%d_%s"
    # The priority contribution header in the "project output" dataframe.
    # Weighted priority score is priority weight * priority contribution.
    __CONTRIBUTION_STRFORMAT = "ETrt_%s_PCP"
    # The project area rank header in the "project output" dataframe.
    __TREATMENT_RANK_HEADER = "treatment_rank"

    # This is for converting a priority weight into a string.
    __WEIGHT_STRFORMAT = "%s:%d"

    # The "project output" dataframe is converted into a dictionary so that it's easier to parse.
    __forsys_output_dict = {}
    # A list of priorities.
    __priorities = []
    # The headers used to parse the "project output" dataframe.
    __priority_weight_headers = []
    __priority_contribution_headers = []
    __project_id_header = ""
    __area_contribution_header = ""
    __cost_contribution_header = ""

    def __save_raw_forsys_output_as_dict(self, raw_forsys_output: "rpy2.robjects.vectors.DataFrame") -> None:
        rdf = raw_forsys_output[self.__PROJECT_OUTPUT_INDEX]
        self.__forsys_output_dict = {
            key: np.asarray(rdf.rx2(key)) for key in rdf.names}

    def __check_header_name(self, header) -> None:
        if header not in self.__forsys_output_dict.keys():
            raise Exception(
                "header, %s, is not a forsys output header" % header)

    def __set_header_names(self, priorities: list[str], area_header: str, cost_header: str, project_id_header: str) -> None:
        self.__priorities = priorities
        self.__priority_weight_headers = [self.__PRIORITY_WEIGHT_STRFORMAT % (
            i+1, priorities[i]) for i in range(len(priorities))]
        for h in self.__priority_weight_headers:
            self.__check_header_name(h)

        self.__priority_contribution_headers = [
            self.__CONTRIBUTION_STRFORMAT % (p) for p in priorities]
        for h in self.__priority_weight_headers:
            self.__check_header_name(h)
        self.__area_contribution_header = self.__CONTRIBUTION_STRFORMAT % area_header
        self.__check_header_name(self.__area_contribution_header)
        self.__cost_contribution_header = self.__CONTRIBUTION_STRFORMAT % cost_header
        self.__check_header_name(self.__cost_contribution_header)
        self.__project_id_header = project_id_header
        self.__check_header_name(self.__project_id_header)

    def __get_weights_str(self, weights: dict) -> str:
        return " ".join([self.__WEIGHT_STRFORMAT % (k, weights[k]) for k in weights.keys()])

    def __get_scenario(self, ind: int) -> tuple[dict, str]:
        weights = {self.__priorities[i]: int(self.__forsys_output_dict[self.__priority_weight_headers[i]][ind])
                   for i in range(len(self.__priorities))}
        return weights, self.__get_weights_str(weights)

    def __create_scenario_project(self,
                                  scenario_weights: dict, ind: int) -> RankedProject:
        project = RankedProject()
        project.id = int(
            self.__forsys_output_dict[self.__project_id_header][ind])
        total = 0
        project.weighted_priority_scores = {}
        for i in range(len(self.__priorities)):
            p = self.__priorities[i]
            contribution = self.__forsys_output_dict[self.__priority_contribution_headers[i]
                                                     ][ind] * scenario_weights[p]
            project.weighted_priority_scores[p] = contribution
            total = total + contribution
        project.total_score = total
        project.rank = int(
            self.__forsys_output_dict[self.__TREATMENT_RANK_HEADER][ind])
        return project

    def __append_project_to_existing_scenario(self, scenario_str: str, scenario_weights: dict, i: int) -> None:
        scenario = self.scenarios[scenario_str]
        ranked_projects = scenario.ranked_projects
        scenario_ind = len(ranked_projects)
        ranked_projects.append(self.__create_scenario_project(
            scenario_weights, i))
        scenario.cumulative_ranked_project_area.append(
            scenario.cumulative_ranked_project_area[scenario_ind-1] + self.__forsys_output_dict[self.__area_contribution_header][i])
        scenario.cumulative_ranked_project_cost.append(
            scenario.cumulative_ranked_project_cost[scenario_ind-1] + self.__forsys_output_dict[self.__cost_contribution_header][i])

    def __append_project_to_new_scenario(self, scenario_str: str, scenario_weights: dict, i: int) -> None:
        scenario = Scenario()
        scenario.priority_weights = scenario_weights
        scenario.ranked_projects = [self.__create_scenario_project(
            scenario_weights, i)]
        scenario.cumulative_ranked_project_area = [
            self.__forsys_output_dict[self.__area_contribution_header][i]]
        scenario.cumulative_ranked_project_cost = [
            self.__forsys_output_dict[self.__cost_contribution_header][i]]
        self.scenarios[scenario_str] = scenario
