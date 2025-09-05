from typing import Any, Dict

from datasets.models import DataLayer
from django.db.models import QuerySet


def get_forsys(**kwargs) -> Dict[str, Any]:
    inclusions = get_forsys_layer_by_capability("inclusion")
    exclusions = get_forsys_layer_by_capability("exclusion")
    slope = get_forsys_layer_by_name("slope")
    distance_from_roads = get_forsys_layer_by_name("distance_from_roads")
    return {
        "name": "forsys",
        "options": {
            "exclusions": list(inclusions),
            "inclusions": list(exclusions),
            "thresholds": {"slope": slope, "distance_from_roads": distance_from_roads},
        },
    }


def get_forsys_layer_by_capability(capability: str) -> QuerySet[DataLayer]:
    query = {"modules": {"forsys": {"capabilities": [capability]}}}
    return DataLayer.objects.filter(query)


def get_forsys_layer_by_name(name: str) -> QuerySet[DataLayer]:
    query = {"modules": {"forsys": {"name": name}}}
    return DataLayer.objects.filter(query).first()


def get_module(module_name: str, **kwargs) -> Dict[str, Any]:
    return MODULE_HANDLERS[module_name]()


MODULE_HANDLERS = {
    "forsys": get_forsys,
}
