from datetime import timedelta
from unittest import mock

import requests
from celery.exceptions import Retry
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.test import SimpleTestCase, TestCase, override_settings
from django.utils import timezone
from funding_report.burn_emulator import (
    BurnEmulatorError,
    BurnEmulatorTransientError,
    request_job,
)
from funding_report.models import FundingOpportunityReport
from funding_report.models import FundingOpportunityReportStatus as S
from funding_report.tasks import (
    async_call_burn_emulator,
    async_finalize_funding_report_results,
    async_funding_report_calculation,
    check_burn_emulator_status,
    poll_burn_emulator_jobs,
    run_funding_opportunity_report_with_burn_emmulator,
    update_report_components,
)
from google.auth.exceptions import DefaultCredentialsError, TransportError
from planning.tests.factories import ProjectAreaFactory, ScenarioFactory

from planscape.celery import beat_schedule

JOB_ID = "20260824/WC711/model/abcdef"


def job(status="pending", **extra):
    return {"job_id": JOB_ID, "status": status, **extra}


@override_settings(BURN_EMULATOR_API_URL="https://burn.example.test/")
class BurnEmulatorClientTest(SimpleTestCase):
    def setUp(self):
        self.token = self.enterContext(
            mock.patch(
                "funding_report.burn_emulator.fetch_id_token", return_value="id-token"
            )
        )
        self.http = self.enterContext(
            mock.patch("funding_report.burn_emulator.requests.request")
        )
        self.http.return_value.status_code = 202
        self.http.return_value.json.return_value = job()

    def test_post_geometry_authentication_and_timeout(self):
        geometry = {"type": "MultiPolygon", "coordinates": []}
        self.assertEqual(request_job("POST", geometry=geometry), job())
        self.token.assert_called_once()
        self.assertEqual(self.token.call_args.args[1], "https://burn.example.test")
        self.http.assert_called_once_with(
            "POST",
            "https://burn.example.test/v1/jobs",
            headers={"Authorization": "Bearer id-token"},
            json={"treatment_area": geometry},
            timeout=300,
        )

    def test_get_preserves_job_path(self):
        self.http.return_value.status_code = 200
        request_job("GET", JOB_ID)
        self.assertEqual(
            self.http.call_args.args,
            ("GET", "https://burn.example.test/v1/jobs/" + JOB_ID),
        )
        self.assertEqual(self.http.call_args.kwargs["timeout"], 30)
        self.assertNotIn("json", self.http.call_args.kwargs)

    def test_terminal_http_errors(self):
        for code in [400, 401, 403, 404, 413]:
            with self.subTest(code=code):
                self.http.return_value.status_code = code
                with self.assertRaises(BurnEmulatorError) as ctx:
                    request_job("POST", geometry={})
                self.assertNotIsInstance(ctx.exception, BurnEmulatorTransientError)

    def test_transient_http_and_transport_errors(self):
        for code in [429, 500, 502, 503]:
            self.http.return_value.status_code = code
            with self.assertRaises(BurnEmulatorTransientError):
                request_job("POST", geometry={})
        self.http.side_effect = requests.Timeout()
        with self.assertRaises(BurnEmulatorTransientError):
            request_job("GET", JOB_ID)

    def test_authentication_failures(self):
        self.token.side_effect = DefaultCredentialsError()
        with self.assertRaises(BurnEmulatorError):
            request_job("GET", JOB_ID)
        self.token.side_effect = TransportError()
        with self.assertRaises(BurnEmulatorTransientError):
            request_job("GET", JOB_ID)
        self.http.assert_not_called()

    def test_invalid_responses(self):
        self.http.return_value.status_code = 200
        for data in [
            [],
            {},
            job("unknown"),
            job("cached"),
            job(job_id=""),
            job(job_id="other"),
        ]:
            with self.subTest(data=data):
                self.http.return_value.json.return_value = data
                with self.assertRaises(BurnEmulatorError):
                    request_job("GET", JOB_ID)
        self.http.return_value.json.side_effect = ValueError()
        with self.assertRaises(BurnEmulatorError):
            request_job("GET", JOB_ID)

    def test_completed_and_failed_responses(self):
        self.http.return_value.status_code = 200
        for data in [
            job("cached", output_path="gs://outputs/output.tif"),
            job("failed", error="runner failed"),
        ]:
            self.http.return_value.json.return_value = data
            self.assertEqual(request_job("GET", JOB_ID), data)

    def test_beat_schedule(self):
        self.assertEqual(
            beat_schedule["check-burn-emulator-jobs"],
            {
                "task": "funding_report.tasks.poll_burn_emulator_jobs",
                "schedule": 60.0,
            },
        )


class BurnEmulatorTaskTest(TestCase):
    def setUp(self):
        self.scenario = ScenarioFactory.create()
        self.report = FundingOpportunityReport.objects.create(
            scenario=self.scenario,
            status=S.RUNNING,
            calculation_status=S.RUNNING,
            burn_simulation_status=S.RUNNING,
            burn_simulation_started_at=timezone.now(),
        )
        self.run_id = self.report.burn_simulation_started_at.isoformat()
        self.api = self.enterContext(
            mock.patch("funding_report.tasks.request_job", return_value=job())
        )
        self.email = self.enterContext(
            mock.patch(
                "funding_report.tasks.async_send_email_funding_report_finished.delay"
            )
        )
        self.export = self.enterContext(
            mock.patch(
                "funding_report.tasks.async_generate_funding_report_geopackage.delay"
            )
        )
        self.events = self.enterContext(
            mock.patch("funding_report.tasks.publish_report_status_by_id")
        )

    def refresh(self):
        self.report.refresh_from_db()
        return self.report

    def set_job(self):
        self.report.burn_simulation_job_id = JOB_ID
        self.report.save(update_fields=["burn_simulation_job_id"])

    def project(self, bounds):
        geometry = MultiPolygon(Polygon.from_bbox(bounds), srid=4326)
        return ProjectAreaFactory.create(
            scenario=self.scenario, geometry=geometry.transform(3857, clone=True)
        )

    def test_submission_unions_and_transforms_geometries(self):
        self.project((-121, 38, -120, 39))
        self.project((-120.5, 38, -119.5, 39))
        self.project((-118, 38, -117, 39))
        async_call_burn_emulator(self.report.pk, self.run_id)
        data = self.api.call_args.kwargs["geometry"]
        import json

        from django.contrib.gis.geos import GEOSGeometry

        merged = GEOSGeometry(json.dumps(data), srid=4326)
        self.assertAlmostEqual(merged.area, 2.5)
        self.assertEqual(merged.geom_type, "MultiPolygon")
        self.assertEqual(self.refresh().burn_simulation_job_id, JOB_ID)
        self.assertEqual(self.report.burn_simulation_status, S.RUNNING)

    def test_cached_submission_stores_output_separately(self):
        self.project((-121, 38, -120, 39))
        self.api.return_value = job("cached", output_path="gs://outputs/output.tif")
        async_call_burn_emulator(self.report.pk, self.run_id)
        self.assertEqual(self.refresh().burn_simulation_status, S.SUCCESS)
        self.assertEqual(self.report.status, S.RUNNING)
        self.assertEqual(
            self.report.burn_simulation_response["output_path"],
            "gs://outputs/output.tif",
        )
        self.assertIsNone(self.report.burn_simulation_datalayer_id)

    def test_submission_transient_retry_and_exhaustion(self):
        self.project((-121, 38, -120, 39))
        self.api.side_effect = BurnEmulatorTransientError("unavailable")
        with mock.patch.object(
            async_call_burn_emulator, "retry", side_effect=Retry()
        ) as retry:
            with self.assertRaises(Retry):
                async_call_burn_emulator(self.report.pk, self.run_id)
            self.assertEqual(
                retry.call_args.kwargs["kwargs"], {"run_started_at": self.run_id}
            )
        with mock.patch.object(async_call_burn_emulator, "max_retries", 0):
            async_call_burn_emulator(self.report.pk, self.run_id)
        self.assertEqual(self.refresh().burn_simulation_status, S.FAILED)

    def test_submission_validation_failure(self):
        async_call_burn_emulator(self.report.pk, self.run_id)
        self.assertEqual(self.refresh().burn_simulation_status, S.FAILED)
        self.api.assert_not_called()

    def test_pending_poll_and_transient_failure(self):
        self.set_job()
        check_burn_emulator_status(self.report.pk)
        self.assertEqual(self.refresh().burn_simulation_status, S.RUNNING)
        self.api.assert_called_once_with("GET", JOB_ID)
        self.api.side_effect = BurnEmulatorTransientError("unavailable")
        check_burn_emulator_status(self.report.pk)
        self.assertEqual(self.refresh().burn_simulation_status, S.RUNNING)

    def test_terminal_poll_errors(self):
        self.set_job()
        self.api.side_effect = BurnEmulatorError("unknown job")
        check_burn_emulator_status(self.report.pk)
        self.assertEqual(self.refresh().burn_simulation_status, S.FAILED)
        self.assertEqual(self.report.burn_simulation_response["error"], "unknown job")

    def test_expired_job_does_not_call_api(self):
        self.set_job()
        self.report.burn_simulation_started_at = timezone.now() - timedelta(hours=24)
        self.report.save(update_fields=["burn_simulation_started_at"])
        check_burn_emulator_status(self.report.pk)
        self.assertEqual(self.refresh().burn_simulation_status, S.FAILED)
        self.api.assert_not_called()

    def test_calculations_then_burn_complete_once(self):
        self.set_job()
        with self.captureOnCommitCallbacks(execute=True):
            async_finalize_funding_report_results([], self.report.pk, self.run_id)
        self.assertEqual(self.refresh().status, S.RUNNING)
        self.email.assert_not_called()
        self.api.return_value = job("cached", output_path="gs://outputs/output.tif")
        with self.captureOnCommitCallbacks(execute=True):
            check_burn_emulator_status(self.report.pk)
            check_burn_emulator_status(self.report.pk)
        self.assertEqual(self.refresh().status, S.SUCCESS)
        self.email.assert_called_once_with(self.report.pk)
        self.export.assert_called_once_with(self.report.pk)
        self.events.assert_called_with(self.report.pk, S.SUCCESS, S.SUCCESS, S.SUCCESS)

    def test_burn_failure_then_successful_calculations(self):
        self.set_job()
        self.api.return_value = job("failed", error="runner failed")
        with self.captureOnCommitCallbacks(execute=True):
            check_burn_emulator_status(self.report.pk)
            async_finalize_funding_report_results([], self.report.pk, self.run_id)
        self.assertEqual(self.refresh().status, S.SUCCESS)
        self.assertEqual(self.report.burn_simulation_response["error"], "runner failed")
        self.email.assert_called_once()

    def test_burn_success_then_failed_calculations(self):
        self.set_job()
        self.api.return_value = job("cached", output_path="gs://outputs/output.tif")
        with self.captureOnCommitCallbacks(execute=True):
            check_burn_emulator_status(self.report.pk)
            async_finalize_funding_report_results(
                [{"error": "bad raster"}], self.report.pk, self.run_id
            )
        self.assertEqual(self.refresh().status, S.FAILED)
        self.email.assert_not_called()

    def test_earlier_run_and_changed_job_are_ignored(self):
        self.set_job()

        def rerun(*args):
            FundingOpportunityReport.objects.filter(pk=self.report.pk).update(
                burn_simulation_started_at=timezone.now(),
                burn_simulation_job_id="new-job",
            )
            return job("failed")

        self.api.side_effect = rerun
        check_burn_emulator_status(self.report.pk)
        async_finalize_funding_report_results([], self.report.pk, self.run_id)
        self.assertEqual(self.refresh().burn_simulation_job_id, "new-job")
        self.assertEqual(self.report.burn_simulation_status, S.RUNNING)
        self.assertEqual(self.report.calculation_status, S.RUNNING)
        self.assertFalse(
            update_report_components(
                self.report.pk, expected_job_id=JOB_ID, burn_simulation_status=S.FAILED
            )
        )

    @override_settings(FEATURE_FLAGS=["FOR_WITH_BURN_EMULATOR"])
    def test_sweep_only_dispatches_active_jobs(self):
        with mock.patch(
            "funding_report.tasks.check_burn_emulator_status.delay"
        ) as check:
            poll_burn_emulator_jobs()
            check.assert_called_once_with(self.report.pk)
        self.report.burn_simulation_status = S.SUCCESS
        self.report.save(update_fields=["burn_simulation_status"])
        with mock.patch(
            "funding_report.tasks.check_burn_emulator_status.delay"
        ) as check:
            poll_burn_emulator_jobs()
            check.assert_not_called()

    @override_settings(FEATURE_FLAGS=[])
    def test_sweep_disabled_does_not_query_or_dispatch_jobs(self):
        self.set_job()
        with mock.patch(
            "funding_report.tasks.check_burn_emulator_status.delay"
        ) as check:
            with self.assertNumQueries(0):
                poll_burn_emulator_jobs()
            check.assert_not_called()
        self.assertEqual(self.refresh().burn_simulation_status, S.RUNNING)
        self.api.assert_not_called()

    def test_missing_reports_and_duplicate_submissions(self):
        async_call_burn_emulator(-1)
        check_burn_emulator_status(-1)
        self.set_job()
        async_call_burn_emulator(self.report.pk, self.run_id)
        self.api.assert_not_called()

    @mock.patch("funding_report.tasks.async_call_burn_emulator.delay")
    @mock.patch("funding_report.tasks.async_funding_report_calculation.delay")
    @mock.patch(
        "funding_report.tasks.treatment_layer_has_valid_data", return_value=True
    )
    def test_rerun_resets_metadata_and_dispatches_once(self, valid, calculations, burn):
        self.project((-121, 38, -120, 39))
        self.report.status = S.SUCCESS
        self.report.calculation_status = S.SUCCESS
        self.report.burn_simulation_status = S.SUCCESS
        self.report.burn_simulation_job_id = JOB_ID
        self.report.burn_simulation_response = job("cached")
        self.report.save()
        with self.captureOnCommitCallbacks(execute=True):
            run_funding_opportunity_report_with_burn_emmulator(self.report.pk)
            run_funding_opportunity_report_with_burn_emmulator(self.report.pk)
        self.assertEqual(self.refresh().status, S.RUNNING)
        self.assertIsNone(self.report.burn_simulation_job_id)
        self.assertIsNone(self.report.burn_simulation_response)
        self.assertNotEqual(
            self.report.burn_simulation_started_at.isoformat(), self.run_id
        )
        calculations.assert_called_once()
        burn.assert_called_once()

    def test_empty_preflight_and_no_dispatch(self):
        self.report.burn_simulation_started_at = None
        self.report.save(update_fields=["burn_simulation_started_at"])
        with mock.patch("funding_report.tasks.async_call_burn_emulator.delay") as burn:
            with self.captureOnCommitCallbacks(execute=True):
                run_funding_opportunity_report_with_burn_emmulator(self.report.pk)
            burn.assert_not_called()
        self.assertEqual(self.refresh().status, S.EMPTY)
        self.assertEqual(self.report.calculation_status, S.EMPTY)
        self.assertEqual(self.report.burn_simulation_status, S.EMPTY)

    def test_stale_calculation_dispatch_ignored(self):
        async_funding_report_calculation(self.report.pk, "old-run")
        self.assertEqual(self.refresh().calculation_status, S.RUNNING)

    def test_poll_does_not_duplicate_inflight_submission(self):
        with mock.patch(
            "funding_report.tasks.async_call_burn_emulator.delay"
        ) as submit:
            check_burn_emulator_status(self.report.pk)
            submit.assert_not_called()
        self.api.assert_not_called()

    @mock.patch("funding_report.tasks.chord")
    @mock.patch("funding_report.tasks.build_datalayer_lookup")
    @mock.patch(
        "funding_report.tasks.treatment_layer_has_valid_data", return_value=True
    )
    def test_calculation_dispatch_finalizes_actual_results(
        self, valid, lookup, chord_mock
    ):
        from funding_report.models import FUNDING_REPORT_YEARS, FundingReportMetric

        self.project((-121, 38, -120, 39))
        self.report.calculation_status = S.PENDING
        self.report.save(update_fields=["calculation_status"])
        lookup.return_value = {
            (metric.value, year, baseline): mock.Mock(pk=1)
            for metric in FundingReportMetric
            for year in FUNDING_REPORT_YEARS
            for baseline in [True, False]
        }
        with self.captureOnCommitCallbacks(execute=True):
            async_funding_report_calculation(self.report.pk, self.run_id)
        callback = chord_mock.return_value.call_args.args[0]
        self.assertEqual(callback.task, async_finalize_funding_report_results.name)
        self.assertEqual(
            callback.kwargs,
            {
                "funding_opportunity_report_id": self.report.pk,
                "run_started_at": self.run_id,
            },
        )
        self.assertEqual(self.refresh().calculation_status, S.RUNNING)
        self.email.assert_not_called()
        # A duplicate delivery must not launch another calculation chord.
        async_funding_report_calculation(self.report.pk, self.run_id)
        chord_mock.assert_called_once()

    @mock.patch(
        "funding_report.tasks.build_datalayer_lookup",
        side_effect=ValueError("missing layers"),
    )
    @mock.patch(
        "funding_report.tasks.treatment_layer_has_valid_data", return_value=True
    )
    def test_calculation_dispatch_validation_failure_is_committed(self, valid, lookup):
        self.project((-121, 38, -120, 39))
        self.report.calculation_status = S.PENDING
        self.report.save(update_fields=["calculation_status"])
        async_funding_report_calculation(self.report.pk, self.run_id)
        self.assertEqual(self.refresh().calculation_status, S.FAILED)
        self.assertEqual(self.report.status, S.FAILED)

    @mock.patch("funding_report.tasks.async_call_burn_emulator.delay")
    @mock.patch(
        "funding_report.tasks.async_funding_report_calculation.delay",
        side_effect=OSError("broker down"),
    )
    @mock.patch(
        "funding_report.tasks.treatment_layer_has_valid_data", return_value=True
    )
    def test_broker_failure_does_not_strand_components(self, valid, calculations, burn):
        self.project((-121, 38, -120, 39))
        self.report.burn_simulation_started_at = None
        self.report.save(update_fields=["burn_simulation_started_at"])
        with self.captureOnCommitCallbacks(execute=True):
            run_funding_opportunity_report_with_burn_emmulator(self.report.pk)
        self.assertEqual(self.refresh().calculation_status, S.FAILED)
        self.assertEqual(self.report.status, S.FAILED)
        burn.assert_called_once()

    @mock.patch(
        "funding_report.tasks.treatment_layer_has_valid_data", return_value=False
    )
    def test_no_treatment_data_skips_burn(self, valid):
        self.project((-121, 38, -120, 39))
        self.report.burn_simulation_started_at = None
        self.report.save(update_fields=["burn_simulation_started_at"])
        with mock.patch("funding_report.tasks.async_call_burn_emulator.delay") as burn:
            with self.captureOnCommitCallbacks(execute=True):
                run_funding_opportunity_report_with_burn_emmulator(self.report.pk)
            burn.assert_not_called()
        self.assertEqual(self.refresh().status, S.EMPTY)
