import json
from typing import Any, Dict, List, Optional, Type, Union

from datasets.models import DataLayer, Dataset, PreferredDisplayType, VisibilityOptions
from django.contrib.gis.geos import GEOSGeometry
from django.db.models import Q, QuerySet
from planning.models import (
    PlanningArea,
    Scenario,
    ScenarioCapability,
    TreatmentGoalUsageType,
)

from modules.serializers import (
    BaseModuleSerializer,
    ForsysModuleSerializer,
    MapModuleSerializer,
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

    def get_datasets(self, geometry: Optional[GEOSGeometry] = None, **kwargs) -> QuerySet[Dataset]:
        queryset = Dataset.objects.all()
        if geometry:
            queryset = queryset.by_outline_intersects(geometry=geometry)
        
        return queryset.filter(
            modules__contains=[self.name],
            preferred_display_type__isnull=False,
            visibility=VisibilityOptions.PUBLIC,
        ).select_related("organization")

    def _get_main_datasets(self, **kwargs):
        return self.get_datasets(**kwargs).filter(
            preferred_display_type=PreferredDisplayType.MAIN_DATALAYERS,
        )

    def _get_base_datasets(self, **kwargs):
        return self.get_datasets(**kwargs).filter(
            preferred_display_type=PreferredDisplayType.BASE_DATALAYERS,
        )

    def _get_options(self, **kwargs) -> Dict[str, Any]:
        return {
            "datasets": {
                "main_datasets": self._get_main_datasets(**kwargs),
                "base_datasets": self._get_base_datasets(**kwargs),
            }
        }

    def get_serializer_class(self, **kwargs) -> Type[BaseModuleSerializer]:
        return BaseModuleSerializer


class ForsysModule(BaseModule):
    name = "forsys"

    def _can_run_planning_area(self, runnable: PlanningArea) -> bool:
        return True

    def _can_run_scenario(self, runnable: Scenario) -> bool:
        return True

    def _get_options(self, **kwargs):
        options = super()._get_options(**kwargs)
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
            **options,
            "exclusions": list(exclusions),
            "inclusions": list(inclusions),
            "thresholds": {"slope": slope, "distance_from_roads": distance_from_roads},
        }

    def get_serializer_class(self, **kwargs) -> Type[BaseModuleSerializer]:
        return ForsysModuleSerializer


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

    def get_datasets(self, **kwargs):
        return Dataset.objects.none()


class MapModule(BaseModule):
    name = "map"

    def __init__(self):
        pass

    def _can_run_planning_area(self, runnable: PlanningArea) -> bool:
        return True

    def _can_run_scenario(self, runnable: Scenario) -> bool:
        return True

    def get_datasets(self, geometry: Optional[GEOSGeometry] = None, **kwargs) -> QuerySet[Dataset]:
        queryset = Dataset.objects.all()
        if geometry:
            queryset = queryset.by_outline_intersects(geometry=geometry)
        
        return queryset.filter(
            Q(preferred_display_type=PreferredDisplayType.MAIN_DATALAYERS)
            | Q(preferred_display_type=PreferredDisplayType.BASE_DATALAYERS)
        ).select_related("organization")

    def get_serializer_class(self, **kwargs) -> Type[BaseModuleSerializer]:
        return MapModuleSerializer


class ClimateForesightModule(BaseModule):
    name = "climate_foresight"

    def _get_future_climate_coverage_polygon(self):
        with open("../assets/future_climate_conditions.geojson") as fp:
            data = json.loads(fp.read())
            return GEOSGeometry(json.dumps(data.get("geometry")))

    def __init__(self):
        self.future_climate_coverage = self._get_future_climate_coverage_polygon()

    def _can_run_planning_area(self, runnable: PlanningArea) -> bool:
        return self.future_climate_coverage.contains(runnable.geometry)

    def _can_run_scenario(self, runnable: Scenario) -> bool:
        scenario_geometry = runnable.planning_area.geometry
        return self.future_climate_coverage.contains(scenario_geometry)

    def get_datasets(self, geometry: Optional[GEOSGeometry] = None, **kwargs) -> QuerySet[Dataset]:
        queryset = Dataset.objects.all()
        if geometry:
            queryset = queryset.by_outline_intersects(geometry=geometry)

        return queryset.filter(
            Q(modules__contains=[self.name])
            & (
                Q(preferred_display_type=PreferredDisplayType.MAIN_DATALAYERS)
                | Q(preferred_display_type=PreferredDisplayType.BASE_DATALAYERS)
            )
        ).select_related("organization")


def get_module(module_name: str) -> BaseModule:
    return MODULE_HANDLERS[module_name]


def compute_scenario_capabilities(scenario: Scenario) -> List[ScenarioCapability]:
    caps = list()
    for key, module in MODULE_HANDLERS.items():
        if module.can_run(scenario):
            caps.append(key.upper())
    return caps


def compute_planning_area_capabilities(
    planning_area: PlanningArea,
) -> List[ScenarioCapability]:
    caps = list()
    for key, module in MODULE_HANDLERS.items():
        if module.can_run(planning_area):
            caps.append(key.upper())
    return caps


MODULE_HANDLERS = {
    "forsys": ForsysModule(),
    "impacts": ImpactsModule(),
    "map": MapModule(),
    "climate_foresight": ClimateForesightModule(),
}
