from io import StringIO
from unittest import mock

from django.core.management import call_command
from django.test import TestCase
from planning.models import GeoPackageStatus

from impacts.models import TreatmentPlanStatus
from impacts.tests.factories import TreatmentPlanFactory


class BackfillTreatmentPlanGeopackagesCommandTest(TestCase):
    def call_command(self, **options):
        out = StringIO()
        err = StringIO()
        call_command(
            "backfill_treatment_plan_geopackages",
            stdout=out,
            stderr=err,
            **options,
        )
        return out.getvalue(), err.getvalue()

    @mock.patch(
        "impacts.management.commands.backfill_treatment_plan_geopackages."
        "async_generate_treatment_plan_geopackage.delay"
    )
    def test_queues_success_treatment_plans_missing_geopackage(self, mock_delay):
        first = TreatmentPlanFactory.create(
            status=TreatmentPlanStatus.SUCCESS,
            geopackage_url=None,
        )
        second = TreatmentPlanFactory.create(
            status=TreatmentPlanStatus.SUCCESS,
            geopackage_url=None,
        )

        out, err = self.call_command()

        self.assertEqual(err, "")
        self.assertIn("Queued 2 GeoPackage generation task(s).", out)
        mock_delay.assert_has_calls(
            [
                mock.call(first.pk),
                mock.call(second.pk),
            ],
            any_order=True,
        )
        first.refresh_from_db()
        second.refresh_from_db()
        self.assertEqual(first.geopackage_status, GeoPackageStatus.PENDING)
        self.assertEqual(second.geopackage_status, GeoPackageStatus.PENDING)

    @mock.patch(
        "impacts.management.commands.backfill_treatment_plan_geopackages."
        "async_generate_treatment_plan_geopackage.delay"
    )
    def test_skips_existing_geopackage_by_default(self, mock_delay):
        treatment_plan = TreatmentPlanFactory.create(
            status=TreatmentPlanStatus.SUCCESS,
            geopackage_url="gs://test-bucket/geopackages/existing.gpkg.zip",
            geopackage_status=GeoPackageStatus.SUCCEEDED,
        )

        out, err = self.call_command()

        self.assertEqual(err, "")
        self.assertIn("Skipped 1 existing GeoPackage(s).", out)
        mock_delay.assert_not_called()
        treatment_plan.refresh_from_db()
        self.assertEqual(
            treatment_plan.geopackage_url,
            "gs://test-bucket/geopackages/existing.gpkg.zip",
        )
        self.assertEqual(treatment_plan.geopackage_status, GeoPackageStatus.SUCCEEDED)

    @mock.patch(
        "impacts.management.commands.backfill_treatment_plan_geopackages."
        "async_generate_treatment_plan_geopackage.delay"
    )
    def test_regenerate_clears_existing_geopackage_and_queues(self, mock_delay):
        treatment_plan = TreatmentPlanFactory.create(
            status=TreatmentPlanStatus.SUCCESS,
            geopackage_url="gs://test-bucket/geopackages/existing.gpkg.zip",
            geopackage_status=GeoPackageStatus.SUCCEEDED,
        )

        out, err = self.call_command(regenerate=True)

        self.assertEqual(err, "")
        self.assertIn("Queued 1 GeoPackage generation task(s).", out)
        mock_delay.assert_called_once_with(treatment_plan.pk)
        treatment_plan.refresh_from_db()
        self.assertIsNone(treatment_plan.geopackage_url)
        self.assertEqual(treatment_plan.geopackage_status, GeoPackageStatus.PENDING)

    @mock.patch(
        "impacts.management.commands.backfill_treatment_plan_geopackages."
        "async_generate_treatment_plan_geopackage.delay"
    )
    def test_treatment_plan_id_only_queues_requested_plan(self, mock_delay):
        requested = TreatmentPlanFactory.create(
            status=TreatmentPlanStatus.SUCCESS,
            geopackage_url=None,
        )
        TreatmentPlanFactory.create(
            status=TreatmentPlanStatus.SUCCESS,
            geopackage_url=None,
        )

        out, err = self.call_command(treatment_plan_id=requested.pk)

        self.assertEqual(err, "")
        self.assertIn("Found 1 Treatment Plan(s).", out)
        mock_delay.assert_called_once_with(requested.pk)

    @mock.patch(
        "impacts.management.commands.backfill_treatment_plan_geopackages."
        "async_generate_treatment_plan_geopackage.delay"
    )
    def test_skips_non_success_treatment_plans(self, mock_delay):
        treatment_plan = TreatmentPlanFactory.create(
            status=TreatmentPlanStatus.FAILURE,
            geopackage_url=None,
        )

        out, err = self.call_command(treatment_plan_id=treatment_plan.pk)

        self.assertEqual(err, "")
        self.assertIn("Skipped 1 non-success Treatment Plan(s).", out)
        mock_delay.assert_not_called()

    @mock.patch(
        "impacts.management.commands.backfill_treatment_plan_geopackages."
        "async_generate_treatment_plan_geopackage.delay"
    )
    def test_dry_run_does_not_queue_or_mutate(self, mock_delay):
        treatment_plan = TreatmentPlanFactory.create(
            status=TreatmentPlanStatus.SUCCESS,
            geopackage_url="gs://test-bucket/geopackages/existing.gpkg.zip",
            geopackage_status=GeoPackageStatus.SUCCEEDED,
        )

        out, err = self.call_command(regenerate=True, dry_run=True)

        self.assertEqual(err, "")
        self.assertIn("Would queue 1 GeoPackage generation task(s).", out)
        mock_delay.assert_not_called()
        treatment_plan.refresh_from_db()
        self.assertEqual(
            treatment_plan.geopackage_url,
            "gs://test-bucket/geopackages/existing.gpkg.zip",
        )
        self.assertEqual(treatment_plan.geopackage_status, GeoPackageStatus.SUCCEEDED)

    @mock.patch(
        "impacts.management.commands.backfill_treatment_plan_geopackages."
        "async_generate_treatment_plan_geopackage.delay"
    )
    def test_missing_treatment_plan_id_writes_error(self, mock_delay):
        out, err = self.call_command(treatment_plan_id=12345)

        self.assertEqual(out, "")
        self.assertIn("Treatment Plan 12345 does not exist.", err)
        mock_delay.assert_not_called()
