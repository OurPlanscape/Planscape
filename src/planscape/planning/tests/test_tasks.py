import json

from django.contrib.gis.geos import GEOSGeometry, MultiPolygon
from django.contrib.gis.db.models import Union
from django.test import TestCase, override_settings
from unittest import mock

from datasets.tests.factories import DataLayerFactory
from datasets.models import DataLayerType
from planning.tests.factories import ScenarioFactory
from planning.tasks import async_calculate_stand_metrics, async_forsys_run
from planning.models import ScenarioResultStatus
from stands.models import StandSizeChoices, StandMetric, Stand
from stands.tests.factories import StandFactory
from planscape.exceptions import ForsysTimeoutException, ForsysException


class AsyncCalculateStandMetricsTest(TestCase):
    def load_stands(self):
        with open("impacts/tests/test_data/stands.geojson") as fp:
            geojson = json.loads(fp.read())

        features = geojson.get("features")
        return list(
            [
                StandFactory.create(
                    geometry=GEOSGeometry(json.dumps(f.get("geometry")), srid=4326),
                    size="LARGE",
                    area_m2=1,
                )
                for f in features
            ]
        )

    def setUp(self):
        self.stands = self.load_stands()
        stand_ids = [s.id for s in self.stands]
        self.planning_area_geometry = MultiPolygon(
            [
                Stand.objects.filter(id__in=stand_ids).aggregate(
                    geometry=Union("geometry")
                )["geometry"]
            ]
        )
        self.datalayer_name = "prio1"
        metadata = {"modules": {"forsys": {"legacy_name": self.datalayer_name}}}
        self.datalayer = DataLayerFactory.create(
            name=self.datalayer_name,
            url="impacts/tests/test_data/test_raster.tif",
            metadata=metadata,
            type=DataLayerType.RASTER,
        )
        self.scenario = ScenarioFactory.create(
            planning_area__geometry=self.planning_area_geometry,
            configuration={
                "stand_size": StandSizeChoices.LARGE,
            },
        )

    def test_async_calculate_stand_metrics(self):
        self.assertEqual(StandMetric.objects.count(), 0)

        async_calculate_stand_metrics(self.scenario.pk, self.datalayer_name)

        self.assertNotEqual(StandMetric.objects.count(), Stand.objects.count())

    def test_async_calculate_stand_metrics_no_stands(self):
        self.assertEqual(StandMetric.objects.count(), 0)

        self.scenario.planning_area.geometry = MultiPolygon()
        self.scenario.planning_area.save()

        async_calculate_stand_metrics(self.scenario.pk, self.datalayer_name)

        self.assertEqual(StandMetric.objects.count(), 0)

    def test_async_calculate_stand_metrics_no_datalayer(self):
        self.assertEqual(StandMetric.objects.count(), 0)
        async_calculate_stand_metrics(self.scenario.pk, "foo_bar")

        self.assertEqual(StandMetric.objects.count(), 0)


@override_settings(FORSYS_VIA_API=False)
class AsyncCallForsysCommandLine(TestCase):
    def setUp(self):
        self.scenario = ScenarioFactory.create()

    @mock.patch(
        "utils.cli_utils._call_forsys_via_command_line",
        return_value=True,
    )
    def test_async_call_forsys_command_line(self, mock):
        async_forsys_run(self.scenario.pk)
        self.scenario.refresh_from_db()
        self.assertEqual(self.scenario.result_status, ScenarioResultStatus.SUCCESS)

    @mock.patch(
        "utils.cli_utils._call_forsys_via_command_line",
        side_effect=ForsysTimeoutException(
            "Forsys command line call timed out after 60000 seconds."
        ),
    )
    def test_async_call_forsys_command_line_timeout(self, mock):
        async_forsys_run(self.scenario.pk)
        self.scenario.refresh_from_db()
        self.assertEqual(self.scenario.result_status, ScenarioResultStatus.TIMED_OUT)

    @mock.patch(
        "utils.cli_utils._call_forsys_via_command_line",
        side_effect=ForsysException("Forsys command line call failed"),
    )
    def test_async_call_forsys_command_line_panic(self, mock):
        async_forsys_run(self.scenario.pk)
        self.scenario.refresh_from_db()
        self.assertEqual(self.scenario.result_status, ScenarioResultStatus.PANIC)


@override_settings(FORSYS_VIA_API=True)
class AsyncCallForsysViaAPI(TestCase):
    def setUp(self):
        self.scenario = ScenarioFactory.create()

    @mock.patch(
        "utils.cli_utils._call_forsys_via_api",
        return_value=True,
    )
    def test_async_call_forsys_via_api(self, mock):
        async_forsys_run(self.scenario.pk)
        self.scenario.refresh_from_db()
        self.assertEqual(self.scenario.result_status, ScenarioResultStatus.SUCCESS)

    @mock.patch(
        "utils.cli_utils._call_forsys_via_api",
        side_effect=ForsysTimeoutException(
            "Forsys API call timed out after 60000 seconds."
        ),
    )
    def test_async_call_forsys_via_api_timeout(self, mock):
        async_forsys_run(self.scenario.pk)
        self.scenario.refresh_from_db()
        self.assertEqual(self.scenario.result_status, ScenarioResultStatus.TIMED_OUT)

    @mock.patch(
        "utils.cli_utils._call_forsys_via_api",
        side_effect=ForsysException("Forsys API call failed"),
    )
    def test_async_call_forsys_via_api_panic(self, mock):
        async_forsys_run(self.scenario.pk)
        self.scenario.refresh_from_db()
        self.assertEqual(self.scenario.result_status, ScenarioResultStatus.PANIC)
