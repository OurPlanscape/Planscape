"""Classes (really structs) for describing boundary layers.

Types defined:
  ShapefileFieldMapping: Mapping from canonical field names to the field names
    in the shapefile.
  Boundary: Metadata about one boundary layer.
  Boundaries: Multiple boundary layers.
"""

from typing import TypedDict
from typing_extensions import NotRequired


class ShapefileFieldMapping(TypedDict):
    shape_name: str
    geometry: str
    states: NotRequired[str]
    acres: NotRequired[str]
    hectares: NotRequired[str]


class Boundary(TypedDict):
    boundary_name: str
    region_name: str
    filepath: NotRequired[str]
    display_name: NotRequired[str]
    shapefile_field_mapping: ShapefileFieldMapping


class Boundaries(TypedDict):
    boundaries: list[Boundary]
