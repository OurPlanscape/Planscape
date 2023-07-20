"""
Valid region names.
"""

import enum


class RegionName(str, enum.Enum):
    """Valid Regions."""
    # Tahoe Central-Sierra Initiative
    TCSI = 'tcsi'

    # California Wildfire and Forest Resilience Task Force regions.
    SIERRA_CASCADE_INYO = 'sierra_cascade_inyo'
    NORTH_COAST_INLAND = 'north_coast_inland'
    COASTAL_INLAND = 'central_coast'
    SOUTHERN_CALIFORNIA = 'southern_california'


def region_to_display_name(region: RegionName) -> str | None:
    """
    Converts a backend RegionName to the display name.
    """
    match region:
        case RegionName.TCSI:
            return 'TCSI'
        case RegionName.SIERRA_CASCADE_INYO:
            return 'Sierra Nevada'
        case RegionName.NORTH_COAST_INLAND:
            return 'Northern California'
        case RegionName.COASTAL_INLAND:
            return 'Central Coast'
        case RegionName.SOUTHERN_CALIFORNIA:
            return 'Southern California'
        case _:
            # Necessary for region names that are now unknown.
            return None


def display_name_to_region(region: str) -> RegionName | None:
    """
    Converts a backend RegionName to the display name.
    """
    match region:
        case 'TCSI':
            return RegionName.TCSI
        case 'Sierra Nevada':
            return RegionName.SIERRA_CASCADE_INYO
        case 'Northern California':
            return RegionName.NORTH_COAST_INLAND
        case 'Central Coast':
            return RegionName.COASTAL_INLAND
        case 'Southern California':
            return RegionName.SOUTHERN_CALIFORNIA
        case _:
            return None
