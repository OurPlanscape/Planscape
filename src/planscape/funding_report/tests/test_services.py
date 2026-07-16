import json
import tempfile
from pathlib import Path

import numpy as np
import rasterio
from datasets.models import DataLayerType
from datasets.tests.factories import DataLayerFactory, DatasetFactory
from django.conf import settings
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.test import TestCase
from planning.services import get_acreage
from planning.tests.factories import (
    PlanningAreaFactory,
    ProjectAreaFactory,
    ScenarioFactory,
)
from pyproj import Geod, Transformer
from rasterio.mask import mask
from rasterio.transform import from_origin

from funding_report.models import (
    FUNDING_REPORT_YEARS,
    TREATMENT_NO_TREATMENT_LABEL,
    TREATMENT_ROLE,
    TREATMENT_VARIABLE,
    BiomassRole,
    FundingOpportunityReport,
    FundingOpportunityReportStatus,
    FundingReportLayerCategory,
    FundingReportMetric,
)
from funding_report.services import (
    _BIOMASS_PIXEL_AREA_ACRES,
    _filter_by_project_id,
    aggregate_delta_pixels,
    build_datalayer_lookup,
    build_flame_length_reduction_results,
    build_funding_report_results,
    build_planning_area_feature,
    build_project_area_features,
    calculate_aet_improvement,
    calculate_biomass_volumes,
    calculate_funding_report_flame_length_reduction,
    calculate_pixel_deltas,
    calculate_project_area_aet_improvement,
    calculate_project_area_delta,
    calculate_treatment_pixel_areas,
    flatten_report_metrics,
    get_aet_delta_datalayer,
    get_biomass_datalayer,
    get_funding_report_layers_of_interest,
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


def geodesic_pixel_area_acres(raster_path: Path, row: int = 0) -> float:
    """
    Independently-computed (not reusing the implementation under test) true
    ground area of one pixel in `row`, used as the expected value for tests
    against rasters in a projected CRS like EPSG:3857, where a pixel's area
    isn't simply its nominal resolution squared.
    """
    with rasterio.open(raster_path) as src:
        transform = src.transform
        to_lonlat = Transformer.from_crs(src.crs, "EPSG:4326", always_xy=True)
        corners = [
            transform * (0, row),
            transform * (1, row),
            transform * (1, row + 1),
            transform * (0, row + 1),
        ]
        lons, lats = zip(*(to_lonlat.transform(x, y) for x, y in corners))
        geod = Geod(ellps="WGS84")
        area_sq_meters, _perimeter = geod.polygon_area_perimeter(lons, lats)
    return abs(area_sq_meters) / settings.CONVERSION_SQM_ACRES


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
    delta = (value_sum - baseline_sum) / baseline_sum * 100 if baseline_sum else 0.0
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

    def create_aet_datalayer(self, role="delta"):
        tmp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(tmp_dir.cleanup)
        raster_path = Path(tmp_dir.name) / f"AET_{role}.tif"
        write_aet_delta_raster(raster_path)
        self.project_area.geometry = raster_bounds_geometry(raster_path)
        self.project_area.save(update_fields=["geometry"])
        return DataLayerFactory.create(
            name=f"AET {role}",
            type=DataLayerType.RASTER,
            url=str(raster_path),
            metadata={
                "modules": {
                    "funding_report": {
                        "variable": "AET",
                        "role": role,
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
        delta_layer = self.create_aet_datalayer(role="delta")

        self.assertEqual(get_aet_delta_datalayer(), delta_layer)

    def test_calculate_project_area_aet_improvement_uses_threshold(self):
        delta_layer = self.create_aet_datalayer(role="delta")

        with rasterio.open(delta_layer.url) as delta_src:
            raster_srid = delta_src.crs.to_epsg()
            improved_acres = calculate_project_area_aet_improvement(
                project_area=self.project_area,
                percentage=15,
                delta_src=delta_src,
                raster_srid=raster_srid,
            )

        # Threshold 15 selects (row 0, col 1)=15, (row 1, col 0)=20, (row 1, col 1)=30.
        expected_acres = geodesic_pixel_area_acres(
            delta_layer.url, row=0
        ) + 2 * geodesic_pixel_area_acres(delta_layer.url, row=1)
        self.assertAlmostEqual(improved_acres, expected_acres, places=6)

    def test_calculate_aet_improvement_returns_acres_and_percent(self):
        percentual_layer = self.create_aet_datalayer(role="percentual")

        results = calculate_aet_improvement(self.report, percentage=15)

        # Threshold 15 selects (row 0, col 1)=15, (row 1, col 0)=20, (row 1, col 1)=30.
        expected_acres = geodesic_pixel_area_acres(
            percentual_layer.url, row=0
        ) + 2 * geodesic_pixel_area_acres(percentual_layer.url, row=1)
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
        self.assertNotIn("interval", summary)

        for project_result in results["projects"][
            FundingReportMetric.TOTAL_FLAME_SEVERITY
        ]:
            self.assertNotIn("interval", project_result)

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


def write_treatment_raster(
    path: Path,
    values: np.ndarray,
    origin_x: float,
    origin_y: float,
    px: float,
    py: float,
    crs: str = "EPSG:4269",
    nodata: int = 0,
) -> None:
    transform = from_origin(origin_x, origin_y, px, py)
    with rasterio.open(
        path,
        "w",
        driver="GTiff",
        height=values.shape[0],
        width=values.shape[1],
        count=1,
        dtype=values.dtype,
        crs=crs,
        transform=transform,
        nodata=nodata,
    ) as dst:
        dst.write(values, 1)


class TreatmentPixelAreaTest(TestCase):
    """
    Covers calculate_treatment_pixel_areas, which previously had no tests -
    the whole-pixel-inclusion bug (a touched pixel's full area counted
    regardless of how much of it actually overlaps the project area) went
    undetected because nothing asserted raster-derived acres against the
    project area's true vector acreage.
    """

    def setUp(self):
        self.planning_area = PlanningAreaFactory.create(with_stands=False)
        self.scenario = ScenarioFactory.create(planning_area=self.planning_area)
        self.report = FundingOpportunityReport.objects.create(
            scenario=self.scenario,
            created_by=self.scenario.user,
        )

    def create_treatment_datalayer(self, raster_path):
        return DataLayerFactory.create(
            name="Treatment",
            type=DataLayerType.RASTER,
            url=str(raster_path),
            metadata={
                "modules": {
                    "funding_report": {
                        "variable": TREATMENT_VARIABLE,
                        "role": TREATMENT_ROLE,
                    }
                }
            },
        )

    def test_pixel_aligned_project_area_matches_vector_acreage(self):
        tmp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(tmp_dir.cleanup)
        raster_path = Path(tmp_dir.name) / "treatment_aligned.tif"
        values = np.ones((10, 10), dtype=np.uint8)
        write_treatment_raster(
            raster_path, values, origin_x=-121.0, origin_y=39.0, px=0.001, py=0.001
        )
        self.create_treatment_datalayer(raster_path)

        project_area = ProjectAreaFactory.create(
            scenario=self.scenario,
            geometry=raster_bounds_geometry(raster_path),
        )

        result = calculate_treatment_pixel_areas(self.report)

        expected_acres = get_acreage(project_area.geometry)
        self.assertAlmostEqual(
            result["projects"][project_area.pk]["Rx Burn"], expected_acres, places=4
        )
        self.assertAlmostEqual(result["total"]["Rx Burn"], expected_acres, places=4)

    def test_irregular_small_project_area_on_coarse_raster_uses_fractional_coverage(
        self,
    ):
        tmp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(tmp_dir.cleanup)
        raster_path = Path(tmp_dir.name) / "treatment_coarse.tif"
        # ~300m pixels, uniform "Rx Burn" (value=1) everywhere.
        values = np.ones((100, 100), dtype=np.uint8)
        write_treatment_raster(
            raster_path,
            values,
            origin_x=-121.01,
            origin_y=39.01,
            px=0.0027,
            py=0.0027,
        )
        self.create_treatment_datalayer(raster_path)

        # Irregular pentagon (~8.3 true acres), deliberately unaligned to the
        # pixel grid and small relative to a ~300m pixel. Whole-pixel
        # inclusion at this resolution can be off by 2x or more (a single
        # touched pixel contributes its full ~22-acre area); fractional
        # coverage should track the true polygon area closely.
        project_area = ProjectAreaFactory.create(
            scenario=self.scenario,
            geometry=MultiPolygon(
                Polygon(
                    (
                        (-121.0000, 39.0000),
                        (-120.9970, 39.0003),
                        (-120.9975, 39.0012),
                        (-120.9990, 39.0015),
                        (-121.0005, 39.0008),
                        (-121.0000, 39.0000),
                    )
                ),
                srid=4269,
            ),
        )

        result = calculate_treatment_pixel_areas(self.report)

        expected_acres = get_acreage(project_area.geometry)
        actual_acres = result["projects"][project_area.pk]["Rx Burn"]
        self.assertAlmostEqual(
            actual_acres, expected_acres, delta=max(expected_acres * 0.02, 0.01)
        )

    def test_no_treatment_pixels_get_fractional_weighting(self):
        tmp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(tmp_dir.cleanup)
        raster_path = Path(tmp_dir.name) / "treatment_partial_nodata.tif"
        # 1 row x 2 cols: left pixel = Rx Burn (1), right pixel = nodata (0).
        values = np.array([[1, 0]], dtype=np.uint8)
        px = py = 0.01
        origin_x, origin_y = -121.0, 39.0
        write_treatment_raster(
            raster_path,
            values,
            origin_x=origin_x,
            origin_y=origin_y,
            px=px,
            py=py,
            nodata=0,
        )
        self.create_treatment_datalayer(raster_path)

        # Spans exactly the right half of pixel 0 and the left half of pixel
        # 1, full pixel height - each half should contribute exactly half of
        # one pixel's true geodesic area.
        minx = origin_x + 0.5 * px
        maxx = origin_x + 1.5 * px
        miny = origin_y - py
        maxy = origin_y
        project_area = ProjectAreaFactory.create(
            scenario=self.scenario,
            geometry=MultiPolygon(
                Polygon(
                    (
                        (minx, miny),
                        (minx, maxy),
                        (maxx, maxy),
                        (maxx, miny),
                        (minx, miny),
                    )
                ),
                srid=4269,
            ),
        )

        result = calculate_treatment_pixel_areas(self.report)

        expected_half_pixel_acres = geodesic_pixel_area_acres(raster_path, row=0) / 2
        project_result = result["projects"][project_area.pk]
        self.assertAlmostEqual(
            project_result["Rx Burn"], expected_half_pixel_acres, places=4
        )
        self.assertAlmostEqual(
            project_result[TREATMENT_NO_TREATMENT_LABEL],
            expected_half_pixel_acres,
            places=4,
        )


class BuildFlameLengthReductionResultsTest(TestCase):
    def test_buckets_results_by_interval_key(self):
        results = build_flame_length_reduction_results(
            [
                {
                    "project_id": 1,
                    "year": 2026,
                    "value": 10,
                    "baseline": 40,
                    "delta": 25.0,
                    "interval": {"from": 7.0, "to": 4.0},
                },
                {
                    "project_id": 2,
                    "year": 2026,
                    "value": 5,
                    "baseline": 20,
                    "delta": 25.0,
                    "interval": {"from": 7.0, "to": 4.0},
                },
                {
                    "project_id": 1,
                    "year": 2026,
                    "value": 2,
                    "baseline": 40,
                    "delta": 5.0,
                    "interval": {"from": 6.0, "to": 4.0},
                },
                {
                    "project_id": 1,
                    "year": 2026,
                    "value": 1,
                    "baseline": 40,
                    "delta": 2.5,
                    "interval": {"from": 4.0, "to": 2.0},
                },
            ]
        )

        self.assertEqual(set(results["summary"].keys()), {"7_4", "6_4", "4_2"})
        self.assertEqual(set(results["projects"].keys()), {"7_4", "6_4", "4_2"})

        seven_four_summary = results["summary"]["7_4"][0]
        self.assertEqual(seven_four_summary["value"], 15)
        self.assertEqual(seven_four_summary["baseline"], 60)
        self.assertAlmostEqual(seven_four_summary["delta"], 15 / 60 * 100)
        self.assertEqual(len(results["projects"]["7_4"]), 2)

    def test_summary_includes_raw_value_and_total_area_aliases(self):
        results = build_flame_length_reduction_results(
            [
                {
                    "project_id": 1,
                    "year": 2026,
                    "value": 10,
                    "baseline": 40,
                    "delta": 25.0,
                    "interval": {"from": 7.0, "to": 4.0},
                },
            ]
        )

        summary = results["summary"]["7_4"][0]
        self.assertEqual(summary["raw_value"], summary["value"])
        self.assertEqual(summary["total_area"], summary["baseline"])

    def test_project_entries_include_raw_value_and_total_area_aliases(self):
        results = build_flame_length_reduction_results(
            [
                {
                    "project_id": 1,
                    "proj_id": "abc",
                    "year": 2026,
                    "value": 10,
                    "baseline": 40,
                    "delta": 25.0,
                    "interval": {"from": 7.0, "to": 4.0},
                },
            ]
        )

        project_result = results["projects"]["7_4"][0]
        self.assertEqual(project_result["raw_value"], project_result["value"])
        self.assertEqual(project_result["total_area"], project_result["baseline"])
        self.assertEqual(project_result["proj_id"], "abc")

    def test_interval_key_formatting_truncates_to_int(self):
        results = build_flame_length_reduction_results(
            [
                {
                    "project_id": 1,
                    "year": 2026,
                    "value": 10,
                    "baseline": 40,
                    "delta": 25.0,
                    "interval": {"from": 7.0, "to": 4.0},
                },
            ]
        )

        self.assertIn("7_4", results["summary"])
        self.assertNotIn("7.0_4.0", results["summary"])

    def test_empty_input_returns_empty_dicts(self):
        self.assertEqual(
            build_flame_length_reduction_results([]),
            {"summary": {}, "projects": {}},
        )

    def test_sorts_by_year_and_project_id_within_bucket(self):
        results = build_flame_length_reduction_results(
            [
                {
                    "project_id": 2,
                    "year": 2026,
                    "value": 20,
                    "baseline": 10,
                    "delta": 3,
                    "interval": {"from": 7.0, "to": 4.0},
                },
                {
                    "project_id": 1,
                    "year": 2026,
                    "value": 5,
                    "baseline": 2,
                    "delta": 1,
                    "interval": {"from": 7.0, "to": 4.0},
                },
            ]
        )

        self.assertEqual(
            [item["project_id"] for item in results["projects"]["7_4"]],
            [1, 2],
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
        self.row0_pixel_acres = geodesic_pixel_area_acres(self.baseline_path, row=0)
        self.row1_pixel_acres = geodesic_pixel_area_acres(self.baseline_path, row=1)

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
        # (row 0, col 0)=8/3 and (row 1, col 1)=8/3 satisfy from_ft=7, to_ft=4.
        expected_reduced_acres = self.row0_pixel_acres + self.row1_pixel_acres

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

        # (row 0, col 0), (row 1, col 0), (row 1, col 1) satisfy from_ft=2, to_ft=3.
        expected_reduced_acres = self.row0_pixel_acres + 2 * self.row1_pixel_acres

        self.assertEqual(result["interval"], {"from": 2.0, "to": 3.0})
        self.assertAlmostEqual(result["value"], expected_reduced_acres, places=6)

    def test_calculate_project_area_delta_flame_severity_includes_at_threshold_pixels(
        self,
    ):
        # Baseline raster has values [[8, 8], [3, 8]]. With from_ft=8 the comparison
        # must be >= (not >) so that pixels exactly at the threshold are included.
        result = calculate_project_area_delta(
            project_area=self.project_area,
            metric=FundingReportMetric.TOTAL_FLAME_SEVERITY.value,
            year=2026,
            datalayer_lookup=self.datalayer_lookup,
            from_ft=8.0,
            to_ft=4.0,
        )

        # Pixels (0,0) and (1,1) have baseline==8 >= 8 and value<=4 → selected.
        expected_reduced_acres = self.row0_pixel_acres + self.row1_pixel_acres
        self.assertEqual(result["interval"], {"from": 8.0, "to": 4.0})
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
            self.assertNotIn("interval", entry)
        for entry in results["projects"]:
            self.assertEqual(entry["project_id"], self.project_area.pk)
            self.assertNotIn("interval", entry)


def write_biomass_rasters(tmp_dir: str):
    """
    Write three aligned 2x2 rasters (10 m pixels, EPSG:3857) for biomass tests.

    Layout (row, col):
      (0,0) softwood  merch=100 bf/ac  non_merch=50 cuft/ac
      (0,1) hardwood  merch=200 bf/ac  non_merch=80 cuft/ac
      (1,0) mixed     merch=300 bf/ac  non_merch=80 cuft/ac
      (1,1) softwood  merch=400 bf/ac  non_merch=100 cuft/ac
    """
    transform = from_origin(0, 20, 10, 10)
    profile = dict(
        driver="GTiff",
        height=2,
        width=2,
        count=1,
        crs="EPSG:3857",
        transform=transform,
        nodata=-9999,
    )
    merch_path = Path(tmp_dir) / "merch-2026.tif"
    non_merch_path = Path(tmp_dir) / "non-merch-2026.tif"
    wt_path = Path(tmp_dir) / "softwood_hardwood_mixed.tif"

    with rasterio.open(merch_path, "w", dtype=np.float32, **profile) as dst:
        dst.write(np.array([[100, 200], [300, 400]], dtype=np.float32), 1)
    with rasterio.open(non_merch_path, "w", dtype=np.float32, **profile) as dst:
        dst.write(np.array([[50, 80], [80, 100]], dtype=np.float32), 1)
    with rasterio.open(wt_path, "w", dtype=np.uint8, **{**profile, "nodata": 0}) as dst:
        dst.write(np.array([[1, 2], [3, 1]], dtype=np.uint8), 1)

    return merch_path, non_merch_path, wt_path


class BiomassVolumesCalculationTest(TestCase):
    def setUp(self):
        tmp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(tmp_dir.cleanup)
        self.merch_path, self.non_merch_path, self.wt_path = write_biomass_rasters(
            tmp_dir.name
        )

        self.geometry = raster_bounds_geometry(self.merch_path)
        planning_area = PlanningAreaFactory.create(
            with_stands=False, geometry=self.geometry
        )
        self.scenario = ScenarioFactory.create(planning_area=planning_area)
        self.project_area = ProjectAreaFactory.create(
            scenario=self.scenario, geometry=self.geometry
        )
        self.report = FundingOpportunityReport.objects.create(
            scenario=self.scenario,
            created_by=self.scenario.user,
        )

    def _create_biomass_datalayer(self, role: str, path: Path):
        return DataLayerFactory.create(
            name=f"Biomass {role}",
            type=DataLayerType.RASTER,
            url=str(path),
            metadata={
                "modules": {"funding_report": {"variable": "BIOMASS", "role": role}}
            },
        )

    def _create_all_biomass_datalayers(self):
        self._create_biomass_datalayer(BiomassRole.MERCHANTABLE, self.merch_path)
        self._create_biomass_datalayer(
            BiomassRole.NON_MERCHANTABLE, self.non_merch_path
        )
        self._create_biomass_datalayer(BiomassRole.WOOD_TYPE, self.wt_path)

    def test_get_biomass_datalayer_returns_correct_layer(self):
        layer = self._create_biomass_datalayer(
            BiomassRole.MERCHANTABLE, self.merch_path
        )

        self.assertEqual(get_biomass_datalayer(BiomassRole.MERCHANTABLE), layer)

    def test_get_biomass_datalayer_raises_when_missing(self):
        with self.assertRaises(ValueError):
            get_biomass_datalayer(BiomassRole.MERCHANTABLE)

    def test_calculate_biomass_volumes_returns_six_values_per_project_and_summary(self):
        self._create_all_biomass_datalayers()

        results = calculate_biomass_volumes(self.report)

        self.assertIn("summary", results)
        self.assertIn("project_areas", results)

        summary = results["summary"]
        expected_keys = {
            "merchantable_softwood_bf",
            "merchantable_hardwood_bf",
            "merchantable_mixed_bf",
            "non_merchantable_softwood_cuft",
            "non_merchantable_hardwood_cuft",
            "non_merchantable_mixed_cuft",
        }
        self.assertEqual(set(summary.keys()), expected_keys)

        self.assertEqual(len(results["project_areas"]), 1)
        project_result = results["project_areas"][0]
        self.assertEqual(project_result["project_id"], self.project_area.pk)
        self.assertEqual(
            set(project_result.keys()), expected_keys | {"project_id", "proj_id"}
        )

    def test_calculate_biomass_volumes_correct_values(self):
        self._create_all_biomass_datalayers()

        results = calculate_biomass_volumes(self.report)

        # Pixel values are in per-acre output units (merch bf/ac, non-merch
        # cuft/ac); they're summed per wood type, then multiplied by the
        # per-pixel acreage to produce totals.
        #
        # Softwood pixels: (0,0) merch=100, nm=50; (1,1) merch=400, nm=100
        # Hardwood pixels: (0,1) merch=200, nm=80
        # Mixed pixels:    (1,0) merch=300, nm=80
        summary = results["summary"]
        self.assertAlmostEqual(
            summary["merchantable_softwood_bf"],
            (100 + 400) * _BIOMASS_PIXEL_AREA_ACRES,
            places=4,
        )
        self.assertAlmostEqual(
            summary["merchantable_hardwood_bf"],
            200 * _BIOMASS_PIXEL_AREA_ACRES,
            places=4,
        )
        self.assertAlmostEqual(
            summary["merchantable_mixed_bf"],
            300 * _BIOMASS_PIXEL_AREA_ACRES,
            places=4,
        )
        self.assertAlmostEqual(
            summary["non_merchantable_softwood_cuft"],
            (50 + 100) * _BIOMASS_PIXEL_AREA_ACRES,
            places=4,
        )
        self.assertAlmostEqual(
            summary["non_merchantable_hardwood_cuft"],
            80 * _BIOMASS_PIXEL_AREA_ACRES,
            places=4,
        )
        self.assertAlmostEqual(
            summary["non_merchantable_mixed_cuft"],
            80 * _BIOMASS_PIXEL_AREA_ACRES,
            places=4,
        )

    def test_calculate_biomass_volumes_nonoverlapping_project_area_returns_zeros(self):
        self._create_all_biomass_datalayers()
        far_away = MultiPolygon(
            Polygon(((10, 10), (10, 11), (11, 11), (11, 10), (10, 10)), srid=4269),
            srid=4269,
        )
        self.project_area.geometry = far_away
        self.project_area.save(update_fields=["geometry"])

        results = calculate_biomass_volumes(self.report)

        summary = results["summary"]
        for key in summary:
            self.assertEqual(
                summary[key], 0.0, msg=f"{key} should be 0 for non-overlapping area"
            )


class FundingReportLayersOfInterestTest(TestCase):
    def create_funding_report_datalayer(self, metric, year, baseline):
        return DataLayerFactory.create(
            name=f"{'Baseline' if baseline else 'Legalmax'} {year} {metric.value}",
            type=DataLayerType.RASTER,
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

    def create_aet_datalayer(self, role):
        return DataLayerFactory.create(
            name=f"AET {role}",
            type=DataLayerType.RASTER,
            metadata={
                "modules": {
                    "funding_report": {
                        "variable": "AET",
                        "role": role,
                    }
                }
            },
        )

    def test_returns_all_keys_with_tagged_layers(self):
        aboveground = self.create_funding_report_datalayer(
            FundingReportMetric.ABOVEGROUND_TOTAL, 2026, True
        )
        smoke = self.create_funding_report_datalayer(
            FundingReportMetric.POTENTIAL_SMOKE, 2026, True
        )
        flame = self.create_funding_report_datalayer(
            FundingReportMetric.TOTAL_FLAME_SEVERITY, 2026, True
        )
        aet_percentual = self.create_aet_datalayer("percentual")

        mills_dataset = DatasetFactory.create(name=settings.FORISK_MILLS_DATASET_NAME)
        mill_layer_1 = DataLayerFactory.create(dataset=mills_dataset)
        mill_layer_2 = DataLayerFactory.create(dataset=mills_dataset)

        result = get_funding_report_layers_of_interest()

        self.assertCountEqual(
            result[FundingReportLayerCategory.CARBON],
            [aboveground, smoke],
        )
        self.assertCountEqual(
            result[FundingReportLayerCategory.WATER],
            [aet_percentual],
        )
        self.assertEqual(
            result[FundingReportLayerCategory.WILDFIRE_RISK_REDUCTION], [flame]
        )
        self.assertCountEqual(
            result[FundingReportLayerCategory.BIOMASS],
            [mill_layer_1, mill_layer_2],
        )

    def test_returns_empty_lists_when_no_layers_tagged(self):
        result = get_funding_report_layers_of_interest()

        for category in FundingReportLayerCategory:
            self.assertEqual(result[category], [])

    def test_mills_layers_scoped_to_named_dataset(self):
        mills_dataset = DatasetFactory.create(name=settings.FORISK_MILLS_DATASET_NAME)
        mill_layer = DataLayerFactory.create(dataset=mills_dataset)

        other_dataset = DatasetFactory.create(name="Some Other Dataset")
        DataLayerFactory.create(dataset=other_dataset)

        result = get_funding_report_layers_of_interest()

        self.assertEqual(
            result[FundingReportLayerCategory.BIOMASS],
            [mill_layer],
        )


class FlattenReportMetricsTest(TestCase):
    def test_flattens_yearly_series_using_year_suffix(self):
        out = {}
        flatten_report_metrics(
            "",
            {
                "ABOVEGROUND_TOTAL": [
                    {"year": 2026, "value": 10, "baseline": 8, "delta": 25.0},
                    {"year": 2031, "value": 12, "baseline": 8, "delta": 50.0},
                ]
            },
            out,
        )
        self.assertEqual(
            out,
            {
                "ABOVEGROUND_TOTAL_2026_value": 10,
                "ABOVEGROUND_TOTAL_2026_baseline": 8,
                "ABOVEGROUND_TOTAL_2026_delta": 25.0,
                "ABOVEGROUND_TOTAL_2031_value": 12,
                "ABOVEGROUND_TOTAL_2031_baseline": 8,
                "ABOVEGROUND_TOTAL_2031_delta": 50.0,
            },
        )

    def test_flattens_wide_dict_without_year_suffix(self):
        out = {}
        flatten_report_metrics(
            "",
            {
                "AET": {
                    "percentage": 25.0,
                    "improved_acres": 1234.5,
                    "total_project_area_acres": 5000.0,
                    "improved_area_percent": 24.69,
                }
            },
            out,
        )
        self.assertEqual(
            out,
            {
                "AET_percentage": 25.0,
                "AET_improved_acres": 1234.5,
                "AET_total_project_area_acres": 5000.0,
                "AET_improved_area_percent": 24.69,
            },
        )

    def test_flattens_list_of_dicts_without_year_using_shared_prefix(self):
        out = {}
        flatten_report_metrics(
            "",
            {
                "BIOMASS_VOLUMES": [
                    {
                        "project_id": 14,
                        "proj_id": None,
                        "merchantable_softwood_bf": 1820.5,
                    }
                ]
            },
            out,
        )
        self.assertEqual(out, {"BIOMASS_VOLUMES_merchantable_softwood_bf": 1820.5})

    def test_flattens_nested_interval_dict_of_lists(self):
        out = {}
        flatten_report_metrics(
            "",
            {
                "TOTAL_FLAME_SEVERITY": {
                    "7_4": [
                        {
                            "year": 2026,
                            "value": 320.5,
                            "baseline": 5000.0,
                            "delta": 6.41,
                        }
                    ],
                    "6_4": [
                        {"year": 2026, "value": 100.0, "baseline": 5000.0, "delta": 2.0}
                    ],
                }
            },
            out,
        )
        self.assertEqual(
            out,
            {
                "TOTAL_FLAME_SEVERITY_7_4_2026_value": 320.5,
                "TOTAL_FLAME_SEVERITY_7_4_2026_baseline": 5000.0,
                "TOTAL_FLAME_SEVERITY_7_4_2026_delta": 6.41,
                "TOTAL_FLAME_SEVERITY_6_4_2026_value": 100.0,
                "TOTAL_FLAME_SEVERITY_6_4_2026_baseline": 5000.0,
                "TOTAL_FLAME_SEVERITY_6_4_2026_delta": 2.0,
            },
        )

    def test_empty_prefix_scalar_is_dropped(self):
        out = {}
        flatten_report_metrics("", None, out)
        self.assertEqual(out, {})


class FilterByProjectIdTest(TestCase):
    def test_filters_flat_list_by_project_id(self):
        value = {
            "ABOVEGROUND_TOTAL": [
                {"project_id": 1, "year": 2026, "value": 10},
                {"project_id": 2, "year": 2026, "value": 20},
            ]
        }
        filtered = _filter_by_project_id(value, 1)
        self.assertEqual(
            filtered,
            {"ABOVEGROUND_TOTAL": [{"project_id": 1, "year": 2026, "value": 10}]},
        )

    def test_filters_nested_interval_dict_by_project_id(self):
        value = {
            "TOTAL_FLAME_SEVERITY": {
                "7_4": [
                    {"project_id": 1, "year": 2026, "value": 10},
                    {"project_id": 2, "year": 2026, "value": 20},
                ]
            }
        }
        filtered = _filter_by_project_id(value, 2)
        self.assertEqual(
            filtered,
            {
                "TOTAL_FLAME_SEVERITY": {
                    "7_4": [{"project_id": 2, "year": 2026, "value": 20}]
                }
            },
        )


class BuildGeopackageFeaturesTest(TestCase):
    def setUp(self):
        self.geometry = MultiPolygon(
            Polygon(((1, 1), (1, 2), (2, 2), (1, 1)), srid=4269), srid=4269
        )
        self.planning_area = PlanningAreaFactory.create(
            with_stands=False, geometry=self.geometry, region_name="sierra-nevada"
        )
        self.scenario = ScenarioFactory.create(planning_area=self.planning_area)
        self.project_area_1 = ProjectAreaFactory.create(
            scenario=self.scenario, geometry=self.geometry
        )
        self.project_area_2 = ProjectAreaFactory.create(
            scenario=self.scenario, geometry=self.geometry
        )
        self.report = FundingOpportunityReport.objects.create(
            scenario=self.scenario,
            created_by=self.scenario.user,
            results={
                "summary": {
                    "ABOVEGROUND_TOTAL": [
                        {"year": 2026, "value": 30, "baseline": 20, "delta": 50.0}
                    ],
                },
                "projects": {
                    "ABOVEGROUND_TOTAL": [
                        {
                            "project_id": self.project_area_1.pk,
                            "proj_id": None,
                            "year": 2026,
                            "value": 10,
                            "baseline": 8,
                            "delta": 25.0,
                        },
                        {
                            "project_id": self.project_area_2.pk,
                            "proj_id": None,
                            "year": 2026,
                            "value": 20,
                            "baseline": 12,
                            "delta": 66.67,
                        },
                    ],
                },
                "treatment_areas": {
                    "projects": {
                        str(self.project_area_1.pk): {"Rx Burn": 5.0},
                    },
                    "total": {"Rx Burn": 5.0},
                },
            },
        )

    def test_build_planning_area_feature_includes_flattened_summary(self):
        feature = build_planning_area_feature(self.report)

        properties = feature["properties"]
        self.assertEqual(properties["id"], self.planning_area.pk)
        self.assertEqual(properties["region_name"], "sierra-nevada")
        self.assertEqual(properties["scenario_id"], self.scenario.pk)
        self.assertEqual(properties["ABOVEGROUND_TOTAL_2026_value"], 30)
        self.assertEqual(properties["ABOVEGROUND_TOTAL_2026_delta"], 50.0)
        self.assertEqual(properties["TREATMENT_AREA_Rx_Burn"], 5.0)
        self.assertEqual(feature["geometry"]["type"], "MultiPolygon")

    def test_build_project_area_features_scopes_results_per_project(self):
        features = build_project_area_features(self.report)
        self.assertEqual(len(features), 2)

        by_id = {f["properties"]["id"]: f["properties"] for f in features}

        project_1 = by_id[self.project_area_1.pk]
        self.assertEqual(project_1["ABOVEGROUND_TOTAL_2026_value"], 10)
        self.assertEqual(project_1["TREATMENT_AREA_Rx_Burn"], 5.0)

        project_2 = by_id[self.project_area_2.pk]
        self.assertEqual(project_2["ABOVEGROUND_TOTAL_2026_value"], 20)
        self.assertNotIn("TREATMENT_AREA_Rx_Burn", project_2)

    def test_build_project_area_features_empty_when_no_project_areas(self):
        empty_scenario = ScenarioFactory.create(planning_area=self.planning_area)
        empty_report = FundingOpportunityReport.objects.create(
            scenario=empty_scenario,
            created_by=empty_scenario.user,
            results={"summary": {}, "projects": {}},
        )

        self.assertEqual(build_project_area_features(empty_report), [])
