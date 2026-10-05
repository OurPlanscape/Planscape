import zipfile
from pathlib import Path
from tempfile import TemporaryDirectory

import fiona
from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase
from fiona.crs import CRS

from datasets.shapefile_geometry import (
    ShapefileGeometryError,
    geometry_from_uploaded_shapefile_zip,
)


def make_shapefile_zip(geometry_type="Polygon", coordinates=None) -> bytes:
    coordinates = coordinates or [
        [
            (0.0, 0.0),
            (0.0, 1.0),
            (1.0, 1.0),
            (1.0, 0.0),
            (0.0, 0.0),
        ]
    ]

    with TemporaryDirectory() as temp_dir:
        shp_path = Path(temp_dir) / "shape.shp"
        schema = {
            "geometry": geometry_type,
            "properties": {"name": "str"},
        }
        with fiona.open(
            shp_path,
            "w",
            driver="ESRI Shapefile",
            crs=CRS.from_epsg(4326),
            schema=schema,
        ) as collection:
            collection.write(
                {
                    "geometry": {
                        "type": geometry_type,
                        "coordinates": coordinates,
                    },
                    "properties": {"name": "test"},
                }
            )

        zip_path = Path(temp_dir) / "shape.zip"
        with zipfile.ZipFile(zip_path, "w") as archive:
            for path in Path(temp_dir).glob("shape.*"):
                if path.suffix != ".zip":
                    archive.write(path, arcname=path.name)

        return zip_path.read_bytes()


class ShapefileGeometryTests(SimpleTestCase):
    def test_geometry_from_uploaded_shapefile_zip_returns_multipolygon(self):
        uploaded_file = SimpleUploadedFile(
            "shape.zip",
            make_shapefile_zip(),
            content_type="application/zip",
        )

        geometry = geometry_from_uploaded_shapefile_zip(uploaded_file)

        self.assertEqual(geometry.geom_type, "MultiPolygon")
        self.assertEqual(geometry.srid, settings.DEFAULT_CRS)
        self.assertFalse(geometry.empty)

    def test_geometry_from_uploaded_shapefile_zip_rejects_non_zip_extension(self):
        uploaded_file = SimpleUploadedFile(
            "shape.txt",
            make_shapefile_zip(),
            content_type="text/plain",
        )

        with self.assertRaisesRegex(ShapefileGeometryError, ".zip"):
            geometry_from_uploaded_shapefile_zip(uploaded_file)

    def test_geometry_from_uploaded_shapefile_zip_rejects_unreadable_zip(self):
        uploaded_file = SimpleUploadedFile(
            "shape.zip",
            b"not a zip",
            content_type="application/zip",
        )

        with self.assertRaisesRegex(ShapefileGeometryError, "Could not read"):
            geometry_from_uploaded_shapefile_zip(uploaded_file)

    def test_geometry_from_uploaded_shapefile_zip_rejects_line_features(self):
        uploaded_file = SimpleUploadedFile(
            "shape.zip",
            make_shapefile_zip(
                geometry_type="LineString",
                coordinates=[
                    (0.0, 0.0),
                    (1.0, 1.0),
                ],
            ),
            content_type="application/zip",
        )

        with self.assertRaisesRegex(ShapefileGeometryError, "polygon"):
            geometry_from_uploaded_shapefile_zip(uploaded_file)
