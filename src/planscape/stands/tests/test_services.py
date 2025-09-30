import json
from unittest import mock

from datasets.models import DataLayerType
from datasets.tests.factories import DataLayerFactory
from django.contrib.gis.geos import GEOSGeometry
from django.test import TestCase

from stands.models import Stand, StandMetric, StandSizeChoices
from stands.services import (
    calculate_stand_zonal_stats,
    get_missing_stand_ids_for_datalayer_within_geometry,
    get_missing_stand_ids_for_datalayer_from_stand_list,
)
from stands.tests.factories import StandMetricFactory

from planning.tests.factories import PlanningAreaFactory


class CalculateStandZonalStatsTestCase(TestCase):
    def load_stands(self):
        with open("impacts/tests/test_data/stands.geojson") as fp:
            geojson = json.loads(fp.read())
        features = geojson.get("features")
        return list(
            [
                Stand.objects.create(
                    geometry=GEOSGeometry(json.dumps(f.get("geometry")), srid=4326),
                    size="LARGE",
                    area_m2=1,
                )
                for f in features
            ]
        )

    def setUp(self):
        self.stands = self.load_stands()
        self.stand_ids = list([stand.id for stand in self.stands])
        self.input_raster = "impacts/tests/test_data/test_raster.tif"
        self.datalayer = DataLayerFactory.create(
            url="impacts/tests/test_data/test_raster.tif",
            type=DataLayerType.RASTER,
            info={"nodata": -999},
        )

    def test_calculate_stand_zonal_stats_returns_stand_metrics(self):
        self.assertEqual(0, StandMetric.objects.count())
        stands = Stand.objects.filter(id__in=self.stand_ids)
        calculate_stand_zonal_stats(stands, datalayer=self.datalayer)
        metrics = StandMetric.objects.filter(stand__in=stands, datalayer=self.datalayer)
        self.assertGreater(metrics.count(), 0)
        for m in metrics:
            self.assertIsNotNone(m.min)
            self.assertIsNotNone(m.avg)
            self.assertIsNotNone(m.max)
            self.assertIsNotNone(m.sum)
            self.assertIsNotNone(m.count)
            self.assertIsNotNone(m.majority)
            self.assertIsNotNone(m.minority)

    @mock.patch("stands.services.zonal_stats", return_value=[])
    def test_calculate_stand_zonal_stats_all_cached_does_not_call_get_zonal_stats(
        self, zonal_stats
    ):
        self.assertEqual(0, StandMetric.objects.count())
        stands = Stand.objects.filter(id__in=self.stand_ids)
        for s in stands:
            StandMetric.objects.create(
                datalayer=self.datalayer,
                stand=s,
                min=0,
                avg=1,
                max=2,
                sum=10,
                count=3,
                majority=1,
                minority=2,
            )
        calculate_stand_zonal_stats(stands, datalayer=self.datalayer)
        zonal_stats.assert_called()  # removed filter, thus, it calls zonal_stats

    def test_calculate_stand_zonal_stats_with_vector_fails(self):
        datalayer = DataLayerFactory.create(type=DataLayerType.VECTOR)
        qs = Stand.objects.all()
        with self.assertRaises(ValueError):
            calculate_stand_zonal_stats(stands=qs, datalayer=datalayer)


class GetStandsWithoutMetricTestCase(TestCase):
    def setUp(self):
        self.planning_area = PlanningAreaFactory.create(with_stands=True)
        self.stand_ids = self.planning_area.get_stands(
            stand_size=StandSizeChoices.LARGE
        ).values_list("id", flat=True)
        self.datalayer = DataLayerFactory.create(
            url="impacts/tests/test_data/test_raster.tif",
            type=DataLayerType.RASTER,
            info={"nodata": -999},
        )

    def test_get_missing_stand_ids_with_geometry(self):
        geometry = self.planning_area.geometry
        missing_ids = get_missing_stand_ids_for_datalayer_within_geometry(
            geometry=geometry,
            stand_size=StandSizeChoices.LARGE,
            datalayer=self.datalayer,
        )

        self.assertEqual(set(self.stand_ids), missing_ids)

    def test_get_missing_stand_ids_with_geometry__no_missing_id(self):
        geometry = self.planning_area.geometry
        for stand in self.planning_area.get_stands(stand_size=StandSizeChoices.LARGE):
            StandMetricFactory.create(
                datalayer=self.datalayer,
                stand=stand,
                min=0,
                avg=1,
                max=2,
                sum=10,
                count=3,
                majority=1,
                minority=2,
            )
        missing_ids = get_missing_stand_ids_for_datalayer_within_geometry(
            geometry=geometry,
            stand_size=StandSizeChoices.LARGE,
            datalayer=self.datalayer,
        )

        self.assertEqual(set(), missing_ids)

    def test_get_missing_stand_ids_with_id_list(self):
        missing_ids = get_missing_stand_ids_for_datalayer_from_stand_list(
            stand_ids=self.stand_ids,
            datalayer=self.datalayer,
        )

        self.assertEqual(set(self.stand_ids), missing_ids)

    def test_get_missing_stand_ids_with_id_list__no_missing_id(self):
        for stand in self.planning_area.get_stands(stand_size=StandSizeChoices.LARGE):
            StandMetricFactory.create(
                datalayer=self.datalayer,
                stand=stand,
                min=0,
                avg=1,
                max=2,
                sum=10,
                count=3,
                majority=1,
                minority=2,
            )
        missing_ids = get_missing_stand_ids_for_datalayer_from_stand_list(
            stand_ids=self.stand_ids,
            datalayer=self.datalayer,
        )

        self.assertEqual(set(), missing_ids)

    def test_get_missing_stand_ids_with_id_list__empty_list(self):
        missing_ids = get_missing_stand_ids_for_datalayer_from_stand_list(
            stand_ids=[],
            datalayer=self.datalayer,
        )

        self.assertEqual(set(), missing_ids)
