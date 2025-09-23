import json
from typing import Any, Dict, List, Union

from datasets.models import DataLayer
from django.contrib.gis.geos import GEOSGeometry
from planning.models import (
    PlanningArea,
    Scenario,
    ScenarioCapability,
    TreatmentGoalUsageType,
)

RunnableItem = Union[PlanningArea, Scenario]


class BaseModule:
    name = "BASE"

    def can_run(self, runnable: RunnableItem) -> bool:
        match runnable:
            case PlanningArea():
                return self._can_run_planning_area(runnable)
            case Scenario():
                return self._can_run_scenario(runnable)
            case _:
                return False

    def _can_run_planning_area(self, runnable: PlanningArea) -> bool:
        raise NotImplementedError

    def _can_run_scenario(self, runnable: Scenario) -> bool:
        raise NotImplementedError

    def get_configuration(self, **kwargs) -> Dict[str, Any]:
        return {"name": self.name, "options": self._get_options(**kwargs)}

    def _get_options(self, **kwargs) -> Dict[str, Any]:
        return {}


class ForsysModule(BaseModule):
    name = "forsys"

    def _can_run_planning_area(self, runnable: PlanningArea) -> bool:
        return True

    def _can_run_scenario(self, runnable: Scenario) -> bool:
        return True

    def _get_options(self, **kwargs):
        inclusions = DataLayer.objects.all().by_meta_capability(
            TreatmentGoalUsageType.INCLUSION_ZONE
        )
        exclusions = DataLayer.objects.all().by_meta_capability(
            TreatmentGoalUsageType.EXCLUSION_ZONE
        )
        slope = DataLayer.objects.all().by_meta_name("slope")
        distance_from_roads = DataLayer.objects.all().by_meta_name(
            "distance_from_roads"
        )
        return {
            "exclusions": list(exclusions),
            "inclusions": list(inclusions),
            "thresholds": {"slope": slope, "distance_from_roads": distance_from_roads},
        }


class ImpactsModule(BaseModule):
    name = "impacts"

    def _get_california_polygon(self):
        with open("../assets/california.geojson") as fp:
            data = json.loads(fp.read())
            return GEOSGeometry(json.dumps(data.get("geometry")))

    def __init__(self):
        self.california = self._get_california_polygon()

    def _can_run_planning_area(self, runnable: PlanningArea) -> bool:
        return True

    def _can_run_scenario(self, runnable: Scenario) -> bool:
        scenario_geometry = runnable.planning_area.geometry
        return self.california.contains(scenario_geometry)


def get_module(module_name: str) -> BaseModule:
    return MODULE_HANDLERS[module_name]


def compute_scenario_capabilities(scenario: Scenario) -> List[ScenarioCapability]:
    caps = list()
    for key, module in MODULE_HANDLERS.items():
        if module._can_run_scenario(scenario):
            caps.append(key.upper())
    return caps


MODULE_HANDLERS = {
    "forsys": ForsysModule(),
    "impacts": ImpactsModule(),
}
