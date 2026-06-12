import json
import tempfile
from pathlib import Path

import numpy as np
import rasterio
from datasets.models import DataLayerType
from datasets.tests.factories import DataLayerFactory
from django.conf import settings
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.test import TestCase
from planning.services import get_acreage
from planning.tests.factories import (
    PlanningAreaFactory,
    ProjectAreaFactory,
    ScenarioFactory,
)
from rasterio.transform import from_origin
from rasterio.mask import mask

from funding_report.models import (
    FUNDING_REPORT_YEARS,
    FundingOpportunityReport,
    FundingOpportunityReportStatus,
    FundingReportMetric,
)
from funding_report.services import (
    aggregate_delta_pixels,
    calculate_aet_improvement,
    build_datalayer_lookup,
    build_funding_report_results,
    calculate_funding_report_flame_length_reduction,
    calculate_pixel_deltas,
    calculate_project_area_aet_improvement,
    calculate_project_area_delta,
    get_aet_delta_datalayer,
)


TEST_DATA = Path("funding_report/tests/test_data")
BASELINE_RASTER = TEST_DATA / "Baseline_2026_aboveground_total_live.tif"
LEGALMAX_RASTER = TEST_DATA / "Legalmax_2026_aboveground_total_live.tif"


def raster_bounds_geometry(raster_path: Path) -> MultiPolygon:
    with rasterio.open(raster_path) as src:
        bounds = src.bounds
        polygon = Polygon(
            (
                (bounds.left, bounds.bottom),
                (bounds.left, bounds.top),
                (bounds.right, bounds.top),
                (bounds.right, bounds.bottom),
                (bounds.left, bounds.bottom),
            ),
            srid=src.crs.to_epsg(),
        )
    return MultiPolygon(polygon.transform(4269, clone=True), srid=4269)


def expected_raster_aggregate(geometry: MultiPolygon) -> dict:
    with rasterio.open(BASELINE_RASTER) as baseline_src:
        raster_geometry = geometry.transform(baseline_src.crs.to_epsg(), clone=True)
        with rasterio.open(LEGALMAX_RASTER) as value_src:
            baseline_data, _ = mask(
                baseline_src,
                [json.loads(raster_geometry.geojson)],
                crop=True,
                filled=False,
            )
            value_data, _ = mask(
                value_src,
                [json.loads(raster_geometry.geojson)],
                crop=True,
                filled=False,
            )

    baseline = baseline_data[0]
    value = value_data[0]
    valid = (
        ~np.ma.getmaskarray(baseline)
        & ~np.ma.getmaskarray(value)
        & np.isfinite(baseline.filled(np.nan))
        & np.isfinite(value.filled(np.nan))
    )
    baseline_values = np.ma.array(baseline, mask=~valid, dtype=float)
    value_values = np.ma.array(value, mask=~valid, dtype=float)
    baseline_sum = float(baseline_values.sum())
    value_sum = float(value_values.sum())
    delta = (
        (value_sum - baseline_sum) / baseline_sum * 100 if baseline_sum else 0.0
    )
    return {
        "baseline": baseline_sum,
        "value": value_sum,
        "delta": delta,
    }


def write_aet_delta_raster(raster_path: Path) -> None:
    values = np.array([[10, 15], [20, 30]], dtype=np.float32)
    transform = from_origin(0, 20, 10, 10)
    with rasterio.open(
        raster_path,
        "w",
        driver="GTiff",
        height=values.shape[0],
        width=values.shape[1],
        count=1,
        dtype=values.dtype,
        crs="EPSG:3857",
        transform=transform,
        nodata=-9999,
    ) as dst:
        dst.write(values, 1)


def write_flame_length_raster(raster_path: Path, values: np.ndarray) -> None:
    transform = from_origin(0, 20, 10, 10)
    with rasterio.open(
        raster_path,
        "w",
        driver="GTiff",
        height=values.shape[0],
        width=values.shape[1],
        count=1,
        dtype=values.dtype,
        crs="EPSG:3857",
        transform=transform,
        nodata=-9999,
    ) as dst:
        dst.write(values, 1)


class FundingReportRasterCalculationTest(TestCase):
    def setUp(self):
        self.geometry = raster_bounds_geometry(BASELINE_RASTER)
        self.planning_area = PlanningAreaFactory.create(
            with_stands=False,
            geometry=self.geometry,
        )
        self.scenario = ScenarioFactory.create(planning_area=self.planning_area)
        self.project_area = ProjectAreaFactory.create(
            scenario=self.scenario,
            geometry=self.geometry,
        )
        self.report = FundingOpportunityReport.objects.create(
            scenario=self.scenario,
            created_by=self.scenario.user,
        )

    def create_datalayer(self, metric, year, baseline):
        return DataLayerFactory.create(
            name=f"{'Baseline' if baseline else 'Legalmax'} {year} {metric.value}",
            type=DataLayerType.RASTER,
            url=str(BASELINE_RASTER if baseline else LEGALMAX_RASTER),
            metadata={
                "modules": {
                    "funding_report": {
                        "year": year,
                        "variable": metric.value,
                        "baseline": baseline,
                    }
                }
            },
        )

    def create_aet_delta_datalayer(self):
        tmp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(tmp_dir.cleanup)
        raster_path = Path(tmp_dir.name) / "AET_legalmax_difference_fvsmasked.tif"
        write_aet_delta_raster(raster_path)
        self.project_area.geometry = raster_bounds_geometry(raster_path)
        self.project_area.save(update_fields=["geometry"])
        return DataLayerFactory.create(
            name="AET delta",
            type=DataLayerType.RASTER,
            url=str(raster_path),
            metadata={
                "modules": {
                    "funding_report": {
                        "variable": "AET",
                        "role": "delta",
                    }
                }
            },
        )

    def test_calculate_pixel_deltas_runs_before_aggregation(self):
        baseline = np.ma.array([[2.0, 4.0]])
        value = np.ma.array([[4.0, 2.0]])

        delta_pixels = calculate_pixel_deltas(baseline, value)

        self.assertEqual(delta_pixels.tolist(), [[1.0, -0.5]])
        self.assertEqual(aggregate_delta_pixels(delta_pixels), 0.5)

    def test_calculate_pixel_deltas_handles_zero_baseline_without_raising(self):
        baseline = np.ma.array([[0.0, 4.0]])
        value = np.ma.array([[5.0, 2.0]])

        with np.errstate(all="raise"):
            delta_pixels = calculate_pixel_deltas(baseline, value)

        self.assertEqual(delta_pixels.tolist(), [[0.0, -0.5]])

    def test_build_datalayer_lookup_skips_incomplete_metadata(self):
        DataLayerFactory.create(
            name="incomplete",
            type=DataLayerType.RASTER,
            url=str(BASELINE_RASTER),
            metadata={
                "modules": {
                    "funding_report": {
                        "year": 2026,
                        # missing "variable" and "baseline"
                    }
                }
            },
        )
        DataLayerFactory.create(
            name="AET delta",
            type=DataLayerType.RASTER,
            url=str(BASELINE_RASTER),
            metadata={
                "modules": {
                    "funding_report": {
                        "variable": "AET",
                        "role": "delta",
                    }
                }
            },
        )
        self.create_datalayer(
            FundingReportMetric.ABOVEGROUND_TOTAL, 2026, baseline=True
        )

        lookup = build_datalayer_lookup()

        self.assertEqual(
            list(lookup.keys()),
            [(FundingReportMetric.ABOVEGROUND_TOTAL.value, 2026, True)],
        )

    def test_get_aet_delta_datalayer_uses_variable_and_role(self):
        delta_layer = self.create_aet_delta_datalayer()

        self.assertEqual(get_aet_delta_datalayer(), delta_layer)

    def test_calculate_project_area_aet_improvement_uses_threshold(self):
        delta_layer = self.create_aet_delta_datalayer()

        with rasterio.open(delta_layer.url) as delta_src:
            raster_srid = delta_src.crs.to_epsg()
            improved_acres = calculate_project_area_aet_improvement(
                project_area=self.project_area,
                percentage=15,
                delta_src=delta_src,
                raster_srid=raster_srid,
            )

        self.assertAlmostEqual(
            improved_acres,
            300 / settings.CONVERSION_SQM_ACRES,
            places=6,
        )

    def test_calculate_aet_improvement_returns_acres_and_percent(self):
        self.create_aet_delta_datalayer()

        results = calculate_aet_improvement(self.report, percentage=15)

        expected_acres = 300 / settings.CONVERSION_SQM_ACRES
        expected_total = get_acreage(self.project_area.geometry)
        self.assertEqual(results["percentage"], 15)
        self.assertAlmostEqual(results["improved_acres"], expected_acres, places=6)
        self.assertAlmostEqual(
            results["total_project_area_acres"], expected_total, places=6
        )
        self.assertAlmostEqual(
            results["improved_area_percent"],
            expected_acres / expected_total * 100,
            places=6,
        )

        self.assertEqual(len(results["project_areas"]), 1)
        project_area_result = results["project_areas"][0]
        self.assertEqual(project_area_result["project_id"], self.project_area.pk)
        self.assertAlmostEqual(
            project_area_result["improved_acres"], expected_acres, places=6
        )
        self.assertAlmostEqual(
            project_area_result["total_acres"], expected_total, places=6
        )
        self.assertAlmostEqual(
            project_area_result["improved_area_percent"],
            expected_acres / expected_total * 100,
            places=6,
        )

    def test_calculate_project_area_delta_raises_for_missing_datalayer(self):
        self.create_datalayer(
            FundingReportMetric.ABOVEGROUND_TOTAL, 2026, baseline=True
        )

        with self.assertRaises(ValueError):
            calculate_project_area_delta(
                project_area=self.project_area,
                metric=FundingReportMetric.ABOVEGROUND_TOTAL.value,
                year=2026,
                datalayer_lookup=build_datalayer_lookup(),
            )

    def test_calculates_project_area_delta_from_raster_pixels(self):
        self.create_datalayer(
            FundingReportMetric.ABOVEGROUND_TOTAL, 2026, baseline=True
        )
        self.create_datalayer(
            FundingReportMetric.ABOVEGROUND_TOTAL, 2026, baseline=False
        )

        result = calculate_project_area_delta(
            project_area=self.project_area,
            metric=FundingReportMetric.ABOVEGROUND_TOTAL,
            year=2026,
        )

        expected = expected_raster_aggregate(self.geometry)
        self.assertEqual(result["variable"], FundingReportMetric.ABOVEGROUND_TOTAL)
        self.assertEqual(result["project_id"], self.project_area.pk)
        self.assertEqual(result["year"], 2026)
        self.assertAlmostEqual(result["baseline"], expected["baseline"], places=4)
        self.assertAlmostEqual(result["value"], expected["value"], places=4)
        self.assertAlmostEqual(result["delta"], expected["delta"], places=4)

    def test_build_results_flame_severity_summary_aggregates_value_baseline_and_percent(
        self,
    ):
        results = build_funding_report_results(
            [
                {
                    "variable": FundingReportMetric.TOTAL_FLAME_SEVERITY,
                    "project_id": 1,
                    "year": 2026,
                    "value": 10,
                    "baseline": 40,
                    "delta": 25.0,
                    "interval": {"from": 7.0, "to": 4.0},
                },
                {
                    "variable": FundingReportMetric.TOTAL_FLAME_SEVERITY,
                    "project_id": 2,
                    "year": 2026,
                    "value": 5,
                    "baseline": 20,
                    "delta": 25.0,
                    "interval": {"from": 7.0, "to": 4.0},
                },
            ]
        )

        summary = results["summary"][FundingReportMetric.TOTAL_FLAME_SEVERITY][0]
        self.assertEqual(summary["value"], 15)
        self.assertEqual(summary["baseline"], 60)
        self.assertAlmostEqual(summary["delta"], 15 / 60 * 100)
        self.assertEqual(summary["interval"], {"from": 7.0, "to": 4.0})

        for project_result in results["projects"][
            FundingReportMetric.TOTAL_FLAME_SEVERITY
        ]:
            self.assertEqual(project_result["interval"], {"from": 7.0, "to": 4.0})

    def test_build_results_uses_projects_and_summary(self):
        results = build_funding_report_results(
            [
                {
                    "variable": FundingReportMetric.ABOVEGROUND_TOTAL,
                    "project_id": 2,
                    "year": 2026,
                    "value": 20,
                    "baseline": 10,
                    "delta": 3,
                },
                {
                    "variable": FundingReportMetric.ABOVEGROUND_TOTAL,
                    "project_id": 1,
                    "year": 2026,
                    "value": 5,
                    "baseline": 2,
                    "delta": 1,
                },
            ]
        )

        self.assertNotIn("variables", results)
        summary = results["summary"][FundingReportMetric.ABOVEGROUND_TOTAL][0]
        self.assertEqual(summary["year"], 2026)
        self.assertEqual(summary["value"], 25)
        self.assertEqual(summary["baseline"], 12)
        self.assertAlmostEqual(summary["delta"], (25 - 12) / 12 * 100)
        self.assertEqual(
            results["projects"][FundingReportMetric.ABOVEGROUND_TOTAL],
            [
                {
                    "project_id": 1,
                    "proj_id": None,
                    "year": 2026,
                    "value": 5,
                    "baseline": 2,
                    "delta": 1,
                },
                {
                    "project_id": 2,
                    "proj_id": None,
                    "year": 2026,
                    "value": 20,
                    "baseline": 10,
                    "delta": 3,
                },
            ],
        )


class FlameLengthReductionCalculationTest(TestCase):
    def setUp(self):
        tmp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(tmp_dir.cleanup)
        self.baseline_path = Path(tmp_dir.name) / "flame_baseline.tif"
        self.value_path = Path(tmp_dir.name) / "flame_value.tif"
        write_flame_length_raster(
            self.baseline_path, np.array([[8, 8], [3, 8]], dtype=np.float32)
        )
        write_flame_length_raster(
            self.value_path, np.array([[3, 5], [3, 3]], dtype=np.float32)
        )

        self.geometry = raster_bounds_geometry(self.baseline_path)
        self.planning_area = PlanningAreaFactory.create(
            with_stands=False,
            geometry=self.geometry,
        )
        self.scenario = ScenarioFactory.create(planning_area=self.planning_area)
        self.project_area = ProjectAreaFactory.create(
            scenario=self.scenario,
            geometry=self.geometry,
        )

        for year in FUNDING_REPORT_YEARS:
            self.create_flame_datalayer(year=year, baseline=True)
            self.create_flame_datalayer(year=year, baseline=False)

        self.datalayer_lookup = build_datalayer_lookup()
        self.pixel_area_acres = 100 / settings.CONVERSION_SQM_ACRES

    def create_flame_datalayer(self, year, baseline):
        return DataLayerFactory.create(
            name=f"{'Baseline' if baseline else 'Legalmax'} {year} TOTAL_FLAME_SEVERITY",
            type=DataLayerType.RASTER,
            url=str(self.baseline_path if baseline else self.value_path),
            metadata={
                "modules": {
                    "funding_report": {
                        "year": year,
                        "variable": FundingReportMetric.TOTAL_FLAME_SEVERITY.value,
                        "baseline": baseline,
                    }
                }
            },
        )

    def test_calculate_project_area_delta_flame_severity_uses_default_interval(self):
        result = calculate_project_area_delta(
            project_area=self.project_area,
            metric=FundingReportMetric.TOTAL_FLAME_SEVERITY.value,
            year=2026,
            datalayer_lookup=self.datalayer_lookup,
        )

        expected_project_area_acres = get_acreage(self.project_area.geometry)
        expected_reduced_acres = 2 * self.pixel_area_acres

        self.assertEqual(result["interval"], {"from": 7.0, "to": 4.0})
        self.assertAlmostEqual(result["value"], expected_reduced_acres, places=6)
        self.assertAlmostEqual(
            result["baseline"], expected_project_area_acres, places=6
        )
        self.assertAlmostEqual(
            result["delta"],
            expected_reduced_acres / expected_project_area_acres * 100,
            places=6,
        )

    def test_calculate_project_area_delta_flame_severity_custom_interval(self):
        result = calculate_project_area_delta(
            project_area=self.project_area,
            metric=FundingReportMetric.TOTAL_FLAME_SEVERITY.value,
            year=2026,
            datalayer_lookup=self.datalayer_lookup,
            from_ft=2.0,
            to_ft=3.0,
        )

        expected_reduced_acres = 3 * self.pixel_area_acres

        self.assertEqual(result["interval"], {"from": 2.0, "to": 3.0})
        self.assertAlmostEqual(result["value"], expected_reduced_acres, places=6)

    def test_calculate_funding_report_flame_length_reduction_returns_summary_and_projects(
        self,
    ):
        report = FundingOpportunityReport.objects.create(
            scenario=self.scenario,
            created_by=self.scenario.user,
            status=FundingOpportunityReportStatus.SUCCESS,
        )

        results = calculate_funding_report_flame_length_reduction(
            report=report, from_ft=7.0, to_ft=4.0
        )

        self.assertEqual(results["interval"], {"from": 7.0, "to": 4.0})
        self.assertEqual(len(results["summary"]), len(FUNDING_REPORT_YEARS))
        self.assertEqual(len(results["projects"]), len(FUNDING_REPORT_YEARS))
        for entry in results["summary"]:
            self.assertEqual(entry["interval"], {"from": 7.0, "to": 4.0})
        for entry in results["projects"]:
            self.assertEqual(entry["project_id"], self.project_area.pk)
            self.assertEqual(entry["interval"], {"from": 7.0, "to": 4.0})
