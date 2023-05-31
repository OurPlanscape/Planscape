"""Classes (really structs) for describing boundary layers.

Types defined:
  ShapefileFieldMapping: Mapping from canonical field names in the Django model
    to the field names in a shapefile.
  Boundary: Metadata about one boundary layer.
  Boundaries: A list of one or more boundary layers.
"""

import enum
from typing import TypedDict
from typing_extensions import NotRequired
from .region_name import RegionName


class GeometryType(str, enum.Enum):
    """Valid geometry types for shapefiles."""
    POINT = 'POINT'
    LINESTRING = 'LINESTRING'
    POLYGON = 'POLYGON'
    MULTIPOINT = 'MULTIPOINT'
    MULTILINESTRING = 'MULTILINESTRING'
    MULTIPOLYGON = 'MULTIPOLYGON'
    GEOMETRYCOLLECTION = 'GEOMETRYCOLLECTION'


class ShapefileFieldMapping(TypedDict):
    shape_name: NotRequired[str]
    objectid: NotRequired[str]
    states: NotRequired[str]
    acres: NotRequired[str]
    hectares: NotRequired[str]


class Boundary(TypedDict):
    boundary_name: str
    display_name: NotRequired[str]
    vector_name: str
    region_name: RegionName
    filepath: str
    source_srs: int  # Spatial Reference System code; see https://en.wikipedia.org/wiki/Spatial_reference_system
    geometry_type: GeometryType
    shapefile_field_mapping: ShapefileFieldMapping


class Boundaries(TypedDict):
    boundaries: list[Boundary]
