"""
Utilities for finding and mapping future climate condition layers.

Future climate layers are stored in a "Future Climate Conditions" DatasetCategory
and are matched to pillars by name. Custom pillars use a default future layer.
"""

import logging
from typing import Dict, Optional

from datasets.models import Category, DataLayer

log = logging.getLogger(__name__)

# default future climate layer to use when no match is found
DEFAULT_FUTURE_CLIMATE_PILLAR = "Fire Dynamics"


def get_future_climate_category() -> Optional[Category]:
    """Get the Future Climate Conditions category."""
    try:
        return Category.objects.get(name="Future Climate Conditions")
    except Category.DoesNotExist:
        log.warning("Future Climate Conditions category not found")
        return None


def find_future_climate_layer_for_pillar(pillar_name: str) -> Optional[DataLayer]:
    """
    Find the future climate layer that matches a pillar by name.

    Args:
        pillar_name: Name of the pillar (e.g., "Fire-Adapted Communities")

    Returns:
        Matching DataLayer or None if not found
    """
    category = get_future_climate_category()
    if not category:
        return None

    # tries to find an exact match or a partial match with contains
    layer = category.datalayers.filter(name__iexact=pillar_name).first()
    if layer:
        log.info(f"Found exact match for pillar '{pillar_name}': layer {layer.id}")
        return layer

    layer = category.datalayers.filter(name__icontains=pillar_name).first()
    if layer:
        log.info(f"Found partial match for pillar '{pillar_name}': layer {layer.id}")
        return layer

    log.info(f"No future climate layer found for pillar '{pillar_name}'")
    return None


def get_default_future_climate_layer() -> Optional[DataLayer]:
    """
    Get the default future climate layer to use for unmapped pillars.

    Currently defaults to "Fire Dynamics". Will be replaced with a generic
    climate vulnerability layer in the future.

    Returns:
        Default future climate DataLayer or None if not found
    """
    category = get_future_climate_category()
    if not category:
        return None

    layer = category.datalayers.filter(
        name__icontains=DEFAULT_FUTURE_CLIMATE_PILLAR
    ).first()

    if layer:
        log.info(f"Using default future climate layer: {layer.name} (id={layer.id})")
    else:
        log.warning(
            f"Default future climate layer '{DEFAULT_FUTURE_CLIMATE_PILLAR}' not found"
        )

    return layer


def map_pillars_to_future_layers(pillar_names: list[str]) -> Dict[str, Dict]:
    """
    Map a list of pillar names to their corresponding future climate layers.

    For each pillar:
    - Try to find a matching future climate layer by name
    - If no match, use the default layer
    - Track whether the match was found or defaulted

    Args:
        pillar_names: List of pillar names to map

    Returns:
        Dictionary mapping pillar_name to:
            {
                'layer_id': DataLayer ID or None,
                'layer_name': DataLayer name or None,
                'matched': True if name-matched, False if default,
                'default': True if using default layer
            }
    """
    mapping = {}

    for pillar_name in pillar_names:
        future_layer = find_future_climate_layer_for_pillar(pillar_name)

        if future_layer:
            mapping[pillar_name] = {
                "layer_id": future_layer.id,
                "layer_name": future_layer.name,
                "matched": True,
                "default": False,
            }
        else:
            default_layer = get_default_future_climate_layer()
            if default_layer:
                mapping[pillar_name] = {
                    "layer_id": default_layer.id,
                    "layer_name": default_layer.name,
                    "matched": False,
                    "default": True,
                }
                log.info(
                    f"Pillar '{pillar_name}' using default future layer: {default_layer.name}"
                )
            else:
                mapping[pillar_name] = {
                    "layer_id": None,
                    "layer_name": None,
                    "matched": False,
                    "default": False,
                }
                log.error(
                    f"No future climate layer available for pillar '{pillar_name}'"
                )

    return mapping
