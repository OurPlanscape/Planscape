""" Class for parsing, validating, and accessing components in the boundary configuration file.

Example usage:
  try:
    config = BoundaryConfig("config.json")
    boundary = config.get_boundary("tcsi")
  except ValueError as err:
    print(err)
"""
import json
from typing import Optional

from base.boundary_types import Boundary


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
        def check_boundaries(boundarylist) -> bool:
            return (isinstance(boundarylist, list) and
                    all([check_boundary(boundary) for boundary in boundarylist]))

        def check_boundary(boundary) -> bool:
            return (isinstance(boundary, dict) and
                    boundary.keys() <= set(['boundary_name', 'region_name', 'filepath', 'display_name', 'shapefile_field_mapping']) and
                    isinstance(boundary['boundary_name'], str) and
                    isinstance(boundary['region_name'], str) and
                    check_shapefile_field_mapping(boundary['shapefile_field_mapping']))

        def check_shapefile_field_mapping(mapping) -> bool:
            return (isinstance(mapping, dict) and
                    mapping.keys() <= set(['shape_name', 'geometry', 'states', 'acres', 'hectares']) and
                    isinstance(mapping['shape_name'], str) and
                    isinstance(mapping['geometry'], str))

        return 'boundaries' in self._config and check_boundaries(self._config['boundaries'])

    def get_boundary(self, boundary_name: str) -> Optional[Boundary]:
        """Gets the named boundary from the configuration.

        Args:
          boundary_name: name of the boundary

        Returns:
          The boundary or None if no such boundary exists.
        """
        for boundary in self._config['boundaries']:
            if boundary['boundary_name'] == boundary_name:
                return boundary
        return None