""" Class for parsing, validating, and accessing components in the boundary configuration file.

Example usage:
  try:
    config = BoundaryConfig("config.json")
    boundary = config.get_boundary("tcsi")
  except ValueError as err:
    print(err)
"""
import json
from typing import List, Optional

from base.boundary_types import Boundary, GeometryType
from base.region_name import RegionName

class BoundaryConfig:
    """
    Class wrapping the configuration of boundaries.
    """

    def __init__(self, filename: str):
        with open(filename, "r") as stream:
            try:
                self._config = json.load(stream)
            except json.JSONDecodeError as exc:
                raise ValueError(
                    "Could not parse JSON file; exception was " + str(exc))
            if not self.check_config():
                raise ValueError("Illegal structure in JSON configuration.")

    def check_config(self) -> bool:
        """Checks the structure of the configuration.
        Returns:
            True if the configuration matches the right structure.
        """


        def check_regions(regionlist) -> bool:
            return (isinstance(regionlist, list) and
                    all([check_region(region) for region in regionlist]))

        def check_region(region) -> bool:
            return (isinstance(region, dict) and
                    region.keys() <= set(['region_name', 'display_name', 'boundaries']) and
                    isinstance(RegionName(region['region_name']), RegionName) and
                    isinstance(region['display_name'], str) and
                    isinstance(region['display_name'], str) and
                    isinstance(region['boundaries'], list) and
                    all([check_boundary(boundary) for boundary in region['boundaries']]))




        def check_boundary(boundary) -> bool:
            return (isinstance(boundary, dict) and
                    boundary.keys() <= set(['boundary_name', 'display_name', 'vector_name', 'region_name', 'filepath', 'source_srs', 
                                            'geometry_type', 'shape_name']) and
                    isinstance(boundary['boundary_name'], str) and
                    isinstance(boundary.get('display_name', ''), str) and
                    isinstance(boundary['vector_name'], str) and
                    isinstance(boundary['region_name'], str) and
                    isinstance(boundary['filepath'], str) and
                    isinstance(boundary['source_srs'], int) and
                    isinstance(GeometryType(boundary['geometry_type']), GeometryType) and 
                    isinstance(boundary['shape_name'], str))


        return 'regions' in self._config and check_regions(self._config['regions'])
