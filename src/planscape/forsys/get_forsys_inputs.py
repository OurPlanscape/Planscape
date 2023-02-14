from conditions.models import BaseCondition, Condition
from conditions.raster_utils import (
    compute_condition_stats_from_raster, get_raster_geo)
from forsys.forsys_request_params import ForsysProjectAreaRankingRequestParams


# Forsys input dataframe headers.
class ForsysInputHeaders():
    # Constant headers for project and stand ID's, area, and cost.
    FORSYS_PROJECT_ID_HEADER = "proj_id"
    FORSYS_STAND_ID_HEADER = "stand_id"
    FORSYS_AREA_HEADER = "area"
    FORSYS_COST_HEADER = "cost"

    # Header prefixes for conditions and priorities.
    _CONDITION_PREFIX = "c_"
    _PRIORITY_PREFIX = "p_"

    # List of headers for priorities.
    # Downstream, this must be in the same order as constructor input
    # priorities.
    priority_headers: list[str]

    def __init__(self, priorities: list[str]) -> None:
        self.priority_headers = []

        for p in priorities:
            self.priority_headers.append(self.get_priority_header(p))

    # Returns a priority header givn a priority string.
    def get_priority_header(self, priority: str) -> str:
        return self._PRIORITY_PREFIX + priority

    # Reteurns a condition hader given a condition string.
    def get_condition_header(self, condition: str) -> str:
        return self._CONDITION_PREFIX + condition


class ForsysProjectAreaRankingInput():
    # A dictionary representing a forsys input dataframe.
    # In the dataframe, headers correspond to ForsysInputHeaders headers. Each
    # row represents a unique stand.
    # Dictionary keys are dataframe headers. Dictionary values are lists
    # corresponding to columns below each dataframe header.
    forsys_input: dict[str, list]

    def __init__(
            self, params: ForsysProjectAreaRankingRequestParams,
            headers: ForsysInputHeaders) -> None:
        region = params.region
        priorities = params.priorities
        project_areas = params.project_areas

        base_condition_ids_to_names = self._get_base_condition_ids_to_names(
            region, priorities)
        conditions = self._get_conditions(base_condition_ids_to_names.keys())

        self.forsys_input = self._get_initialized_forsys_input(
            headers, priorities)

        for proj_id in project_areas.keys():
            geo = get_raster_geo(project_areas[proj_id])

            self.forsys_input[headers.FORSYS_PROJECT_ID_HEADER].append(proj_id)
            self.forsys_input[headers.FORSYS_STAND_ID_HEADER].append(proj_id)
            self.forsys_input[headers.FORSYS_AREA_HEADER].append(geo.area)
            # TODO: figure out the right value for the units: 5000 is just a
            # placeholder.
            self.forsys_input[headers.FORSYS_COST_HEADER].append(
                geo.area * 5000)
            for c in conditions:
                # TODO: replace this with select_related.
                name = base_condition_ids_to_names[c.condition_dataset_id]
                stats = compute_condition_stats_from_raster(
                    geo, c.raster_name)
                if stats['count'] == 0:
                    raise Exception(
                        "no score was retrieved for condition, %s" % name)
                self.forsys_input[headers.get_priority_header(
                    name)].append(stats['count'] - stats['sum'])

    def _get_base_condition_ids_to_names(self, region: str,
                                         priorities: list) -> dict[int, str]:
        base_condition_ids_to_names = {
            c.pk: c.condition_name
            for c in BaseCondition.objects.filter(region_name=region).filter(
                condition_name__in=priorities).all()}
        if len(priorities) != len(base_condition_ids_to_names.keys()):
            raise Exception("of %d priorities, only %d had base conditions" % (
                len(priorities), len(base_condition_ids_to_names.keys())))
        return base_condition_ids_to_names

    def _get_conditions(self, condition_ids: list[int]) -> list[Condition]:
        conditions = list(Condition.objects.filter(
            condition_dataset_id__in=condition_ids).filter(
            is_raw=False).all())
        if len(condition_ids) != len(conditions):
            raise Exception(
                "of %d priorities, only %d had conditions" %
                (len(condition_ids),
                 len(conditions)))
        return conditions

    def _get_initialized_forsys_input(self, headers: ForsysInputHeaders,
                                      priorities: list[str]) -> dict[str, list]:
        forsys_input = {}
        forsys_input[headers.FORSYS_PROJECT_ID_HEADER] = []
        forsys_input[headers.FORSYS_STAND_ID_HEADER] = []
        forsys_input[headers.FORSYS_AREA_HEADER] = []
        forsys_input[headers.FORSYS_COST_HEADER] = []
        for p in priorities:
            forsys_input[headers.get_priority_header(p)] = []
        return forsys_input
