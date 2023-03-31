import rpy2

import numpy as np

from django.contrib.gis.gdal import CoordTransform, SpatialReference
from django.contrib.gis.geos import GEOSGeometry, MultiPolygon, Polygon
from forsys.merge_polygons import merge_polygons
from planscape import settings
from typing import TypedDict


class RankedProject(TypedDict):
    # Project ID.
    id: int
    # Contribution of each priority to the total score.
    # Contribution is priority weight * priority impact.
    weighted_priority_scores: dict[str, float]
    # The total score, summed across weighted priority scores.
    total_score: float
    # Project rank.
    rank: int
    # Project geometry [in wkt format].
    # This is only necessary for ProjectGenerationOutput.
    geo_wkt: str


class Scenario(TypedDict):
    # Priority weights for the scenario.
    priority_weights: dict[str, float]
    # A list of the projects, ranked according to a weighted sum of benefit/AP
    # scores with the highest scoring at index 0.
    ranked_projects: list[RankedProject]
    # Given ranked projects, a cumulative sum of project area.
    cumulative_ranked_project_area: list[float]
    # Given ranked projects, a cumulative sum of project cost.
    cumulative_ranked_project_cost: list[float]


# Transforms the output of a Forsys scenario set run into a more
# easily-interpreted version.
class ForsysRankingOutputForMultipleScenarios():
    # The raw forsys output consists of 3 R dataframes. This is the index of
    # the "project output" dataframe.
    _PROJECT_OUTPUT_INDEX = 1

    # ---------------------------
    # string patterns for headers
    # ---------------------------
    # The priority weight header in the "project output" dataframe.
    _PRIORITY_WEIGHT_STRFORMAT = "Pr_%d_%s"
    # The priority contribution header in the "project output" dataframe.
    # Weighted priority score is priority weight * priority contribution.
    _TREATMENT_IMPACT_STRFORMAT = "ETrt_%s"
    # The project area rank header in the "project output" dataframe.
    _TREATMENT_RANK_HEADER = "treatment_rank"

    # This is for converting a (priority, weight) pair into a string.
    _WEIGHT_STRFORMAT = "%s:%d"

    # A dictionary of the forsys output, organized by scenario. The key is a
    # list of "<priority>:<weight>" pairs separated by spaces.
    scenarios: dict[str, Scenario]

    # The "project output" dataframe is converted into a dictionary of lists so
    # that it's easier to parse.
    _forsys_project_output_df: dict[str, list]
    # The conditions to be prioritized.
    _priorities: list[str]
    # The headers used to parse the "project output" dataframe.
    _priority_weight_headers: list[str]
    _priority_contribution_headers: list[str]
    _project_id_header: str
    _area_contribution_header: str
    _cost_contribution_header: str

    # Global constraints.
    # If set, as projects are appended to scenarios by order of impact, they
    # are ignored if their addition causes cumulative_area or cumulative_cost
    # to surpass _max_area and _max_cost.
    _max_area: float | None
    _max_cost: float | None

    # Initializes a ForsysScenarioSetOutput instance given raw forsys output
    # and the following inputs to the forsys call: header names, list of
    # priorities.
    # Of note, priorities must be listed in the same format and order they're
    # listed for the forsys call.
    def __init__(
            self, raw_forsys_output: dict[str, dict[str, list]],
            priorities: list[str],
            max_area: float, max_cost: float, project_id_header: str,
            area_header: str, cost_header: str):
        self._forsys_project_output_df = raw_forsys_output["project"]

        self._set_header_names(priorities, area_header,
                               cost_header, project_id_header)

        self._max_area = max_area
        self._max_cost = max_cost

        self.scenarios = {}
        for i in range(len(self._forsys_project_output_df[project_id_header])):
            scenario_weights, scenario_str = self._get_scenario(i)

            if scenario_str in self.scenarios.keys():
                self._append_ranked_project_to_existing_scenario(
                    scenario_str, scenario_weights, i)
            else:
                self._append_ranked_project_to_new_scenario(
                    scenario_str, scenario_weights, i)

    def _check_header_name(self, header) -> None:
        if header not in self._forsys_project_output_df.keys():
            raise Exception(
                "header, %s, is not a forsys output header" % header)

    def _set_header_names(
            self, priorities: list[str],
            area_header: str, cost_header: str, project_id_header: str) -> None:
        self._priorities = priorities
        self._priority_weight_headers = [self._PRIORITY_WEIGHT_STRFORMAT % (
            i+1, priorities[i]) for i in range(len(priorities))]
        for h in self._priority_weight_headers:
            self._check_header_name(h)

        self._priority_contribution_headers = [
            self._TREATMENT_IMPACT_STRFORMAT % (p) for p in priorities]
        for h in self._priority_contribution_headers:
            self._check_header_name(h)
        self._area_contribution_header = self._TREATMENT_IMPACT_STRFORMAT % area_header
        self._check_header_name(self._area_contribution_header)
        self._cost_contribution_header = self._TREATMENT_IMPACT_STRFORMAT % cost_header
        self._check_header_name(self._cost_contribution_header)
        self._project_id_header = project_id_header
        self._check_header_name(self._project_id_header)

    def _get_weights_str(self, weights: dict) -> str:
        return " ".join([self._WEIGHT_STRFORMAT % (k, weights[k])
                         for k in weights.keys()])

    def _get_scenario(self, ind: int) -> tuple[dict, str]:
        weights = {
            self._priorities[i]: int(self._forsys_project_output_df[
                self._priority_weight_headers[i]][ind])
            for i in range(len(self._priorities))
        }
        return weights, self._get_weights_str(weights)

    def _create_ranked_project(
            self, scenario_weights: dict, ind: int) -> RankedProject:
        project: RankedProject = {
            'id': int(
                self._forsys_project_output_df[self._project_id_header][ind]),
            'weighted_priority_scores': {},
            'rank': int(
                self._forsys_project_output_df[self._TREATMENT_RANK_HEADER][ind]),
            'total_score': 0,
        }
        for i in range(len(self._priorities)):
            p = self._priorities[i]
            contribution = self._forsys_project_output_df[
                self._priority_contribution_headers[i]
            ][ind] * scenario_weights[p]
            project['weighted_priority_scores'][p] = contribution
            project['total_score'] = project['total_score'] + contribution
        return project

    def _append_ranked_project_to_existing_scenario(
            self, scenario_str: str, scenario_weights: dict, i: int) -> None:
        scenario = self.scenarios[scenario_str]
        ranked_projects = scenario['ranked_projects']
        scenario_ind = len(ranked_projects)

        cumulative_area = scenario['cumulative_ranked_project_area'][
            scenario_ind - 1] + self._forsys_project_output_df[
            self._area_contribution_header][i]
        if self._max_area is not None and self._max_area < cumulative_area:
            return

        cumulative_cost = scenario['cumulative_ranked_project_cost'][
            scenario_ind - 1] + self._forsys_project_output_df[
            self._cost_contribution_header][i]
        if self._max_cost is not None and self._max_cost < cumulative_cost:
            return

        ranked_projects.append(self._create_ranked_project(
            scenario_weights, i))
        scenario['cumulative_ranked_project_area'].append(cumulative_area)
        scenario['cumulative_ranked_project_cost'].append(cumulative_cost)

    def _append_ranked_project_to_new_scenario(
            self, scenario_str: str, scenario_weights: dict, i: int) -> None:
        area = self._forsys_project_output_df[self._area_contribution_header][
            i]
        if self._max_area is not None and self._max_area < area:
            return
        cost = self._forsys_project_output_df[self._cost_contribution_header][
            i]
        if self._max_cost is not None and self._max_cost < cost:
            return

        scenario: Scenario = {
            'priority_weights': scenario_weights,
            'ranked_projects': [self._create_ranked_project(
                scenario_weights, i)],
            'cumulative_ranked_project_area': [area],
            'cumulative_ranked_project_cost': [cost],
        }
        self.scenarios[scenario_str] = scenario


# Transforms the output of a Forsys scenario run into a more
# easily-interpreted version.
class ForsysRankingOutputForASingleScenario():
    # The raw forsys output consists of 3 R dataframes. This is the index of
    # the "project output" dataframe.
    _PROJECT_OUTPUT_INDEX = 1

    # ---------------------------
    # string patterns for headers
    # ---------------------------
    # The project-level treatment impact header format in the forsys "project
    # output" dataframe. Recall:
    # - Treatment impact for a project is the sum of the treatment impacts of
    # individual stands [selected for treatment given global constraints].
    # - Treatment impact of individual stands is specified as part of the forsys
    # input dataframe.
    _TREATMENT_IMPACT_STRFORMAT = "ETrt_%s"
    # The project area rank header in the "project output" dataframe.
    _TREATMENT_RANK_HEADER = "treatment_rank"

    # This is for converting a (priority, weight) pair into a string.
    _WEIGHT_STRFORMAT = "%s:%d"

    # The parsed scenario.
    scenario: Scenario

    # The raw forsys output consists of 3 R dataframes.
    # The "project output" dataframe is converted into a dictionary of lists so
    # that it's easier to process in Python.
    _forsys_project_output_df: dict[str, list]
    # The conditions to be prioritized.
    # This represents the keys of constructor input parameter, priority_weights.
    _priorities: list[str]
    # The headers used to parse the "project output" dataframe.
    _priority_contribution_headers: list[str]
    _project_id_header: str
    _area_contribution_header: str
    _cost_contribution_header: str

    # Global constraints.
    # If set, as projects are appended to scenarios by order of impact, they
    # are ignored if their addition causes cumulative_area or cumulative_cost
    # to surpass _max_area and _max_cost.
    _max_area: float | None
    _max_cost: float | None

    # Initializes a ForsysScenarioOutput instance given a pre-converted forsys output
    # and the following inputs to the forsys call: header names, list of
    # priorities.
    # Of note, priorities must be listed in the same format and order they're
    # listed for the forsys call.
    def __init__(self, raw_forsys_output: dict[str, dict[str, list]],
                 priority_weights: dict[str, float], max_area, max_cost,
                 project_id_header: str, area_header: str, cost_header: str):
        self._forsys_project_output_df = raw_forsys_output["project"]

        self._set_header_names(list(priority_weights.keys()), area_header,
                               cost_header, project_id_header)

        self._max_area = max_area
        self._max_cost = max_cost

        self.scenario = Scenario(
            {'priority_weights': priority_weights, 'ranked_projects': [],
             'cumulative_ranked_project_area': [],
             'cumulative_ranked_project_cost': []})
        for i in range(len(self._forsys_project_output_df[project_id_header])):
            self._append_ranked_project_to_scenario(priority_weights, i)

    def _check_header_name(self, header) -> None:
        if header not in self._forsys_project_output_df.keys():
            raise Exception(
                "header, %s, is not a forsys output header" % header)

    def _set_header_names(
            self, priorities: list[str],
            area_header: str, cost_header: str, project_id_header: str) -> None:
        self._priorities = priorities

        self._priority_contribution_headers = [
            self._TREATMENT_IMPACT_STRFORMAT % (p) for p in priorities]
        for p in self._priority_contribution_headers:
            self._check_header_name(p)
        self._area_contribution_header = self._TREATMENT_IMPACT_STRFORMAT % area_header
        self._check_header_name(self._area_contribution_header)
        self._cost_contribution_header = self._TREATMENT_IMPACT_STRFORMAT % cost_header
        self._check_header_name(self._cost_contribution_header)
        self._project_id_header = project_id_header
        self._check_header_name(self._project_id_header)

    def _create_ranked_project(
            self, scenario_weights: dict[str, float],
            ind: int) -> RankedProject:
        project: RankedProject = {
            'id': int(
                self._forsys_project_output_df[self._project_id_header][ind]),
            'weighted_priority_scores': {},
            'rank': int(
                self._forsys_project_output_df[self._TREATMENT_RANK_HEADER][ind]),
            'total_score': 0,
        }
        for i in range(len(self._priorities)):
            p = self._priorities[i]
            contribution = self._forsys_project_output_df[
                self._priority_contribution_headers[i]
            ][ind] * scenario_weights[p]
            project['weighted_priority_scores'][p] = contribution
            project['total_score'] = project['total_score'] + contribution
        return project

    # TODO: merge logic in _append_ranked_project_to_scenario
    # _append_ranked_project_to_new_scenario, and
    # _append_ranked_project_to_existing_scenario into a single function.
    def _append_ranked_project_to_scenario(
            self, priority_weights: dict[str, float],
            i: int) -> None:
        ranked_projects = self.scenario['ranked_projects']
        scenario_ind = len(ranked_projects)

        cumulative_area = self._forsys_project_output_df[
            self._area_contribution_header][i]
        if scenario_ind > 0:
            cumulative_area = cumulative_area + \
                self.scenario['cumulative_ranked_project_area'][scenario_ind - 1]
        if self._max_area is not None and self._max_area < cumulative_area:
            return

        cumulative_cost = self._forsys_project_output_df[
            self._cost_contribution_header][i]
        if scenario_ind > 0:
            cumulative_cost = cumulative_cost + \
                self.scenario['cumulative_ranked_project_cost'][scenario_ind - 1]
        if self._max_cost is not None and self._max_cost < cumulative_cost:
            return

        ranked_projects.append(self._create_ranked_project(
            priority_weights, i))
        self.scenario['cumulative_ranked_project_area'].append(
            cumulative_area)
        self.scenario['cumulative_ranked_project_cost'].append(
            cumulative_cost)


# Transforms the output of a Forsys scenario run into a more
# easily-interpreted version.
class ForsysGenerationOutputForASingleScenario(
        ForsysRankingOutputForASingleScenario):
    # Along with the constants and variables below, this inherits the class
    # constants and variables of ForsysRankingOutputForASingleScenario.

    # The raw forsys output consists of 3 R dataframes. This is the index of
    # the "stand output" dataframe.
    _STAND_OUTPUT_INDEX = 0

    # This is used when parsing the raw forsys output's stand output dataframe.
    _geo_wkt_header: str

    # The raw forsys output consists of 3 R dataframes.
    # The "stand output" dataframe is converted into a dictionary of lists so
    # that it's easier to process in Python.
    _forsys_stand_output_df: dict[str, list]

    def __init__(
            self, raw_forsys_output: dict[str, dict[str, list]],
            priority_weights: dict[str, float],
            project_id_header: str, area_header: str, cost_header: str,
            geo_wkt_header: str):
        ForsysRankingOutputForASingleScenario.__init__(
            self, raw_forsys_output, priority_weights, None, None,
            project_id_header, area_header, cost_header)

        self._forsys_stand_output_df = raw_forsys_output["stand"]
        if geo_wkt_header not in self._forsys_stand_output_df.keys():
            raise Exception(
                "header, %s, is not a forsys output header" % geo_wkt_header)
        self._geo_wkt_header = geo_wkt_header

        project_area_geometries = self._get_project_area_geometries(
            self._forsys_stand_output_df)
        self._populate_geo_wkt_in_ranked_projects(project_area_geometries)

    def _get_project_area_geometries(
        self, stand_output_df: dict[str, list]
    ) -> dict[int, Polygon | MultiPolygon]:
        return self._merge_geos(
            self._extract_geo_list(stand_output_df)
        )

    def _extract_geo_list(
            self, stand_output_df: dict[str, list]
    ) -> dict[int, list[Polygon]]:
        project_area_geometries = {}
        for i in range(len(stand_output_df[self._project_id_header])):
            id = stand_output_df[self._project_id_header][i]
            geo = GEOSGeometry(stand_output_df[self._geo_wkt_header][i])
            if id in project_area_geometries:
                project_area_geometries[id].append(geo)
            else:
                project_area_geometries[id] = [geo]
        return project_area_geometries

    def _merge_geos(self,
                    project_area_geometries: dict[int, list[Polygon]]
                    ) -> dict[int, Polygon | MultiPolygon]:
        merged_polygons = {}
        for id in project_area_geometries.keys():
            geo = merge_polygons(
                project_area_geometries[id], 0)
            geo.transform(
                CoordTransform(
                    SpatialReference(settings.CRS_9822_PROJ4),
                    SpatialReference(settings.DEFAULT_CRS)))
            geo.srid = settings.DEFAULT_CRS
            merged_polygons[id] = geo
        return merged_polygons

    def _populate_geo_wkt_in_ranked_projects(
            self,
            project_area_geometries: dict[int, Polygon | MultiPolygon]) -> None:
        for ranked_project in self.scenario['ranked_projects']:
            ranked_project['geo_wkt'] = project_area_geometries[
                ranked_project['id']].wkt
