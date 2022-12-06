"""
Valid region names.
"""

import enum

class RegionName(str, enum.Enum):
    """Valid Regions."""

    # California Wildfire and Forest Resilience Task Force regions.
    SIERRA_CASCADE_INYO = 'sierra_cascade_inyo'
    NORTH_COAST_INLAND = 'north_coast_inland'
    COASTAL_INLAND = 'coastal_inland'
    SOUTHERN_CALIFORNIA = 'southern_california'

