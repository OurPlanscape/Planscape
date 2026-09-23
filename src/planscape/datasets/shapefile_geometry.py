import json
import tempfile
from pathlib import Path
from typing import Any, Iterable, Optional

import fiona
from django.conf import settings
from django.contrib.gis.geos import GEOSGeometry
from django.core.files.uploadedfile import UploadedFile
from fiona.errors import DriverError
from planning.geometry import drop_z, fix_geometry, to_multipolygon


class ShapefileGeometryError(ValueError):
    pass


def _uploaded_file_chunks(uploaded_file: UploadedFile) -> Iterable[bytes]:
    uploaded_file.seek(0)
    return uploaded_file.chunks()


def _srid_from_crs(crs: Any) -> Optional[int]:
    if not crs:
        return None
    try:
        return crs.to_epsg()
    except AttributeError:
        return None


def _geometry_from_feature(feature_geometry: Any, srid: int) -> GEOSGeometry:
    geometry = GEOSGeometry(json.dumps(feature_geometry.__geo_interface__), srid=srid)
    geometry.srid = srid
    return geometry


def _read_polygon_geometry(zip_path: Path) -> GEOSGeometry:
    vsi_path = f"/vsizip/{zip_path}"
    geometries = []
    srid = None

    try:
        layers = fiona.listlayers(vsi_path)
    except DriverError as exc:
        raise ShapefileGeometryError("Could not read uploaded shapefile zip.") from exc

    for layer in layers:
        try:
            with fiona.open(vsi_path, layer=layer) as src:
                layer_srid = _srid_from_crs(src.crs) or 4326
                schema_geometry = (src.schema or {}).get("geometry", "")
                if schema_geometry not in {"Polygon", "MultiPolygon"}:
                    continue

                for feature in src:
                    feature_geometry = feature.get("geometry")
                    if not feature_geometry:
                        continue
                    geometry = _geometry_from_feature(feature_geometry, layer_srid)
                    if geometry.geom_type not in {"Polygon", "MultiPolygon"}:
                        continue
                    geometries.append(geometry)
                    srid = srid or layer_srid
        except DriverError:
            continue

    if not geometries:
        raise ShapefileGeometryError(
            "Uploaded zip must contain at least one polygon shapefile feature."
        )

    geometry = geometries[0]
    for next_geometry in geometries[1:]:
        if next_geometry.srid != geometry.srid:
            next_geometry = next_geometry.transform(geometry.srid, clone=True)
        geometry = geometry.union(next_geometry)

    if srid and geometry.srid != srid:
        geometry.srid = srid
    if geometry.srid != settings.DEFAULT_CRS:
        geometry = geometry.transform(settings.DEFAULT_CRS, clone=True)

    geometry = fix_geometry(geometry)
    geometry = to_multipolygon(geometry)
    geometry = drop_z(geometry)

    if geometry.empty or not geometry.valid:
        raise ShapefileGeometryError("Uploaded shapefile geometry is invalid.")

    return geometry


def geometry_from_uploaded_shapefile_zip(uploaded_file: UploadedFile) -> GEOSGeometry:
    if not uploaded_file.name.lower().endswith(".zip"):
        raise ShapefileGeometryError("Uploaded shapefile must be a .zip file.")

    with tempfile.NamedTemporaryFile(suffix=".zip") as temp_file:
        for chunk in _uploaded_file_chunks(uploaded_file):
            temp_file.write(chunk)
        temp_file.flush()
        geometry = _read_polygon_geometry(Path(temp_file.name))

    uploaded_file.seek(0)
    return geometry
