from typing import Dict, Any


def flatten_region(region: Dict[str, Any]) -> Dict[str, Any]:
    # creates a generator
    regions = (region for region in [region])
    pillars = flatten_inner(regions, "pillars")
    elements = flatten_inner(pillars, "elements")
    metrics = flatten_inner(elements, "metrics")
    return metrics


def flatten_inner(parents, key):
    for parent in parents:
        children = parent.pop(key)
        for child in children:
            yield {**parent, **child}
