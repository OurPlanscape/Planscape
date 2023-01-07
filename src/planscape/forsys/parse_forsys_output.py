import rpy2

import numpy as np

class Scenario():
    priority_weights = {}
    ranked_projects = []
    cumulative_ranked_project_area = []
    cumulative_ranked_project_cost = []

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
    id = -1
    weighted_priority_contributions = {}
    total_contribution = 0
    rank = -1

    def to_dictionary(self) -> dict:
        output = {
            'id': self.id,
            'weighted_priority_contributions': self.weighted_priority_contributions,
            'total_contribution': self.total_contribution,
            'rank': self.rank,
        }
        return output


class ForsysScenarioSetOutput():
    scenarios = {}

    def to_dictionary(self) -> dict:
        output = {}
        for k in self.scenarios.keys():
            output[k] = self.scenarios[k].to_dictionary()
        return output

    def __init__(self, raw_forsys_output: "rpy2.robjects.vectors.ListVector", priorities: list[str], project_id_header: str, area_header: str, cost_header: str):
        self.__forsys_output_dict = self.__convert_rdf_to_dict(
            raw_forsys_output[self.__PROJECT_OUTPUT_INDEX])

        self.__priorities = priorities
        self.__priority_weight_headers = [self.__PRIORITY_WEIGHT_STRFORMAT % (
            i+1, priorities[i]) for i in range(len(priorities))]
        self.__priority_contribution_headers = [
            self.__PRIORITY_CONTRIBUTION_STRFORMAT % (p) for p in priorities]
        self.__area_contribution_header = self.__CONTRIBUTION_STRFORMAT % area_header
        self.__cost_contribution_header = self.__CONTRIBUTION_STRFORMAT % cost_header
        self.__project_id_header = project_id_header

        for i in range(len(self.__forsys_output_dict[project_id_header])):
            scenario_weights, scenario_str = self.__get_scenario(i)

            if scenario_str in self.scenarios.keys():
                scenario = self.scenarios[scenario_str]
                ranked_projects = scenario.ranked_projects
                scenario_ind = len(ranked_projects)
                ranked_projects.append(self.__create_scenario_project(
                    scenario_weights, i, scenario_ind + 1))
                scenario.cumulative_ranked_project_area.append(
                    scenario.cumulative_ranked_project_area[scenario_ind-1] + self.__forsys_output_dict[self.__area_contribution_header][i])
                scenario.cumulative_ranked_project_cost.append(
                    scenario.cumulative_ranked_project_cost[scenario_ind-1] + self.__forsys_output_dict[self.__cost_contribution_header][i])
            else:
                scenario = Scenario()
                scenario.priority_weights = scenario_weights
                scenario.ranked_projects = [self.__create_scenario_project(
                    scenario_weights, i, 1)]
                scenario.cumulative_ranked_project_area = [
                    self.__forsys_output_dict[self.__area_contribution_header][i]]
                scenario.cumulative_ranked_project_cost = [
                    self.__forsys_output_dict[self.__cost_contribution_header][i]]

                self.scenarios[scenario_str] = scenario

    __PROJECT_OUTPUT_INDEX = 1
    __PRIORITY_WEIGHT_STRFORMAT = "Pr_%d_p_%s"
    __PRIORITY_CONTRIBUTION_STRFORMAT = "ETrt_p_%s_PCP"
    __CONTRIBUTION_STRFORMAT = "ETrt_%s_PCP"
    __WEIGHT_STRFORMAT = "%s:%d"

    __forsys_output_dict = {}
    __priorities = []
    __priority_weight_headers = []
    __priority_contribution_headers = []
    __project_id_header = ""
    __area_contribution_header = ""
    __cost_contribution_header = ""

    # Converts R dataframe to a dictionary of numpy arrays.

    def __convert_rdf_to_dict(self, rdf: "rpy2.robjects.vectors.DataFrame") -> dict:
        return {key: np.asarray(rdf.rx2(key)) for key in rdf.names}

    def __get_weights_str(self, weights: dict) -> str:
        return " ".join([self.__WEIGHT_STRFORMAT % (k, weights[k]) for k in weights.keys()])

    def __get_scenario(self, ind: int) -> tuple[dict, str]:
        weights = {self.__priorities[i]: int(self.__forsys_output_dict[self.__priority_weight_headers[i]][ind])
                   for i in range(len(self.__priorities))}
        return weights, self.__get_weights_str(weights)

    def __create_scenario_project(self,
                                  scenario_weights: dict, ind: int, rank: int) -> RankedProject:
        project = RankedProject()
        project.id = int(self.__forsys_output_dict[self.__project_id_header][ind])
        total = 0
        project.weighted_priority_contributions = {}
        for i in range(len(self.__priorities)):
            p = self.__priorities[i]
            contribution = self.__forsys_output_dict[self.__priority_contribution_headers[i]
                                                     ][ind] * scenario_weights[p]
            project.weighted_priority_contributions[p] = contribution
            total = total + contribution
        project.total_contribution = total
        project.rank = rank
        return project
