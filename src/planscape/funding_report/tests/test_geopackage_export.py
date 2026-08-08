import tempfile
from pathlib import Path

import fiona
import numpy as np
import rasterio
from datasets.models import DataLayerType
from datasets.tests.factories import DataLayerFactory
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.test import TestCase
from planning.tests.factories import (
    PlanningAreaFactory,
    ProjectAreaFactory,
    ScenarioFactory,
)
from rasterio.transform import from_origin

from funding_report.models import FundingOpportunityReport
from funding_report.services import (
    export_planning_area_results_to_geopackage,
    export_project_areas_results_to_geopackage,
    export_treatment_raster_to_geopackage,
)


def write_categorical_treatment_raster(path: Path) -> None:
    """
    Mimics the real treatment_datalayer: small-int categorical pixel values
    (1=Rx Burn, 2=Thin and Rx Burn) with a Byte nodata value, as produced by
    generate_treatment_clip_datalayer.
    """
    values = np.array([[1, 2], [0, 1]], dtype=np.uint8)
    transform = from_origin(-121.0, 39.0, 0.0003, 0.0003)
    with rasterio.open(
        path,
        "w",
        driver="GTiff",
        height=values.shape[0],
        width=values.shape[1],
        count=1,
        dtype=values.dtype,
        crs="EPSG:4269",
        transform=transform,
        nodata=0,
    ) as dst:
        dst.write(values, 1)


class GeopackageExportTest(TestCase):
    def setUp(self):
        tmp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(tmp_dir.cleanup)
        self.raster_path = Path(tmp_dir.name) / "treatment_clip.tif"
        write_categorical_treatment_raster(self.raster_path)

        with rasterio.open(self.raster_path) as src:
            bounds = src.bounds
            srid = src.crs.to_epsg()

        self.geometry = MultiPolygon(
            Polygon(
                (
                    (bounds.left, bounds.bottom),
                    (bounds.left, bounds.top),
                    (bounds.right, bounds.top),
                    (bounds.right, bounds.bottom),
                    (bounds.left, bounds.bottom),
                ),
                srid=srid,
            ).transform(4269, clone=True),
            srid=4269,
        )

        self.planning_area = PlanningAreaFactory.create(
            with_stands=False, geometry=self.geometry
        )
        self.scenario = ScenarioFactory.create(planning_area=self.planning_area)
        self.project_area = ProjectAreaFactory.create(
            scenario=self.scenario, geometry=self.geometry
        )
        self.datalayer = DataLayerFactory.create(
            name="treatment clip",
            type=DataLayerType.RASTER,
            url=str(self.raster_path),
        )
        self.report = FundingOpportunityReport.objects.create(
            scenario=self.scenario,
            created_by=self.scenario.user,
            treatment_datalayer=self.datalayer,
            results={
                "summary": {
                    "ABOVEGROUND_TOTAL": [
                        {"year": 2026, "value": 30, "baseline": 20, "delta": 50.0}
                    ]
                },
                "projects": {
                    "ABOVEGROUND_TOTAL": [
                        {
                            "project_id": self.project_area.pk,
                            "proj_id": None,
                            "year": 2026,
                            "value": 30,
                            "baseline": 20,
                            "delta": 50.0,
                        }
                    ]
                },
            },
        )

        self.out_path = Path(tmp_dir.name) / "funding_report.gpkg"

    def test_vector_and_raster_layers_coexist_in_one_gpkg(self):
        export_planning_area_results_to_geopackage(self.report, self.out_path)
        export_project_areas_results_to_geopackage(self.report, self.out_path)
        export_treatment_raster_to_geopackage(self.report, self.out_path)

        layers = fiona.listlayers(str(self.out_path))
        self.assertIn("planning_area", layers)
        self.assertIn("project_areas", layers)

        with fiona.open(str(self.out_path), layer="planning_area") as layer:
            features = list(layer)
            self.assertEqual(len(features), 1)
            self.assertEqual(
                features[0]["properties"]["ABOVEGROUND_TOTAL_2026_value"], 30
            )

        with fiona.open(str(self.out_path), layer="project_areas") as layer:
            features = list(layer)
            self.assertEqual(len(features), 1)
            self.assertEqual(
                features[0]["properties"]["id"], self.project_area.pk
            )

        with rasterio.open(str(self.out_path)) as src:
            self.assertEqual(src.width, 2)
            self.assertEqual(src.height, 2)
            data = src.read(1)
            self.assertEqual(data[0, 0], 1)
            self.assertEqual(data[0, 1], 2)

    def test_project_areas_with_different_metric_keys(self):
        other_project_area = ProjectAreaFactory.create(
            scenario=self.scenario, geometry=self.geometry
        )
        self.report.results = {
            "summary": {},
            "projects": {
                "ABOVEGROUND_TOTAL": [
                    {
                        "project_id": self.project_area.pk,
                        "year": 2026,
                        "value": 30,
                        "baseline": 20,
                        "delta": 50.0,
                    }
                ],
                "POTENTIAL_SMOKE": [
                    {
                        "project_id": other_project_area.pk,
                        "year": 2026,
                        "value": 5,
                        "baseline": 4,
                        "delta": 1.0,
                    }
                ],
            },
        }
        self.report.save(update_fields=["results"])

        export_project_areas_results_to_geopackage(self.report, self.out_path)

        with fiona.open(str(self.out_path), layer="project_areas") as layer:
            features = {f["properties"]["id"]: f["properties"] for f in layer}
            self.assertEqual(
                features[self.project_area.pk]["ABOVEGROUND_TOTAL_2026_value"], 30
            )
            self.assertIsNone(
                features[self.project_area.pk]["POTENTIAL_SMOKE_2026_value"]
            )
            self.assertEqual(
                features[other_project_area.pk]["POTENTIAL_SMOKE_2026_value"], 5
            )
            self.assertIsNone(
                features[other_project_area.pk]["ABOVEGROUND_TOTAL_2026_value"]
            )

    def test_skips_raster_layer_when_no_treatment_datalayer(self):
        self.report.treatment_datalayer = None
        self.report.save(update_fields=["treatment_datalayer"])

        export_planning_area_results_to_geopackage(self.report, self.out_path)
        export_project_areas_results_to_geopackage(self.report, self.out_path)
        export_treatment_raster_to_geopackage(self.report, self.out_path)

        self.assertTrue(self.out_path.exists())
        layers = fiona.listlayers(str(self.out_path))
        self.assertIn("planning_area", layers)
        self.assertIn("project_areas", layers)
