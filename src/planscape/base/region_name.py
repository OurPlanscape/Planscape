"""
Valid region names.
"""

import enum


class RegionName(str, enum.Enum):
    """Valid Regions."""
    # Tahoe Central-Sierra Initiative
    TCSI = 'tcsi'

    # California Wildfire and Forest Resilience Task Force regions.
    SIERRA_NEVADA = 'sierra-nevada'
    NORTHERN_CALIFORNIA = 'northern-california'
    CENTRAL_COAST = 'central-coast'
    SOUTHERN_CALIFORNIA = 'southern-california'


def region_to_display_name(region: RegionName) -> str | None:
    """
    Converts a backend RegionName to the display name.
    """
    match region:
        case RegionName.TCSI:
            return 'TCSI'
        case RegionName.SIERRA_NEVADA:
            return 'Sierra Nevada'
        case RegionName.NORTHERN_CALIFORNIA:
            return 'Northern California'
        case RegionName.CENTRAL_COAST:
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
            return RegionName.SIERRA_NEVADA
        case 'Northern California':
            return RegionName.NORTHERN_CALIFORNIA
        case 'Central Coast':
            return RegionName.CENTRAL_COAST
        case 'Southern California':
            return RegionName.SOUTHERN_CALIFORNIA
        case _:
            return None
