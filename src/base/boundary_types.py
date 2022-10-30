"""Classes (really structs) for describing boundary layers.

Types defined:
  ShapefileFieldMapping: Mapping from canonical field names in the Django model
    to the field names in a shapefile.
  Boundary: Metadata about one boundary layer.
  Boundaries: A list of one or more boundary layers.
"""

from typing import TypedDict
from typing_extensions import NotRequired


class ShapefileFieldMapping(TypedDict):
    geometry: str
    shape_name: NotRequired[str]
    objectid: NotRequired[str]
    states: NotRequired[str]
    acres: NotRequired[str]
    hectares: NotRequired[str]


class Boundary(TypedDict):
    boundary_name: str
    display_name: NotRequired[str]
    region_name: str
    filepath: str
    source_srs: int
    shapefile_field_mapping: ShapefileFieldMapping


class Boundaries(TypedDict):
    boundaries: list[Boundary]
