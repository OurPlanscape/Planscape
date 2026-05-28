from unittest import mock

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from funding_report.models import FundingOpportunityReport, FundingOpportunityReportStatus
from planning.tests.factories import PlanningAreaFactory, ScenarioFactory
from planscape.tests.factories import UserFactory


class RunFundingOpportunityReportTest(APITestCase):
    def setUp(self):
        self.user = UserFactory.create()
        self.planning_area = PlanningAreaFactory.create(user=self.user)
        self.scenario = ScenarioFactory.create(
            user=self.user,
            planning_area=self.planning_area,
        )
        self.url = reverse("api:funding_report:funding-opportunity-reports-run")

    @mock.patch("funding_report.views.run_funding_opportunity_report")
    def test_run_creates_report_and_returns_202(self, task_mock):
        self.client.force_authenticate(self.user)
        response = self.client.post(self.url, {"scenario": self.scenario.pk}, format="json")

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(FundingOpportunityReport.objects.count(), 1)
        report = FundingOpportunityReport.objects.get()
        self.assertEqual(report.scenario, self.scenario)
        self.assertEqual(report.created_by, self.user)
        task_mock.delay.assert_called_once_with(report.pk)

    @mock.patch("funding_report.views.run_funding_opportunity_report")
    def test_run_reuses_existing_report(self, task_mock):
        existing = FundingOpportunityReport.objects.create(
            scenario=self.scenario,
            created_by=self.user,
        )
        self.client.force_authenticate(self.user)
        response = self.client.post(self.url, {"scenario": self.scenario.pk}, format="json")

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(FundingOpportunityReport.objects.count(), 1)
        task_mock.delay.assert_called_once_with(existing.pk)

    def test_run_requires_authentication(self):
        response = self.client.post(self.url, {"scenario": self.scenario.pk}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @mock.patch("funding_report.views.run_funding_opportunity_report")
    def test_run_with_nonexistent_scenario_returns_404(self, task_mock):
        self.client.force_authenticate(self.user)
        response = self.client.post(self.url, {"scenario": 999999}, format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        task_mock.delay.assert_not_called()

    @mock.patch("funding_report.views.run_funding_opportunity_report")
    def test_run_response_contains_expected_fields(self, task_mock):
        self.client.force_authenticate(self.user)
        response = self.client.post(self.url, {"scenario": self.scenario.pk}, format="json")

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        data = response.json()
        self.assertIn("id", data)
        self.assertIn("scenario", data)
        self.assertIn("status", data)
        self.assertIn("created_at", data)
        self.assertIn("updated_at", data)
        self.assertEqual(data["status"], FundingOpportunityReportStatus.PENDING)


class GetStatusFundingOpportunityReportTest(APITestCase):
    def setUp(self):
        self.user = UserFactory.create()
        self.planning_area = PlanningAreaFactory.create(user=self.user)
        self.scenario = ScenarioFactory.create(
            user=self.user,
            planning_area=self.planning_area,
        )
        self.url = reverse("api:funding_report:funding-opportunity-reports-get-status")

    def _create_report(self, report_status=FundingOpportunityReportStatus.PENDING):
        return FundingOpportunityReport.objects.create(
            scenario=self.scenario,
            created_by=self.user,
            status=report_status,
        )

    def test_get_status_returns_pending(self):
        self._create_report(FundingOpportunityReportStatus.PENDING)
        self.client.force_authenticate(self.user)
        response = self.client.get(self.url, {"scenario": self.scenario.pk})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["status"], FundingOpportunityReportStatus.PENDING)

    def test_get_status_returns_running(self):
        self._create_report(FundingOpportunityReportStatus.RUNNING)
        self.client.force_authenticate(self.user)
        response = self.client.get(self.url, {"scenario": self.scenario.pk})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["status"], FundingOpportunityReportStatus.RUNNING)

    def test_get_status_returns_success(self):
        self._create_report(FundingOpportunityReportStatus.SUCCESS)
        self.client.force_authenticate(self.user)
        response = self.client.get(self.url, {"scenario": self.scenario.pk})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["status"], FundingOpportunityReportStatus.SUCCESS)

    def test_get_status_returns_failed(self):
        self._create_report(FundingOpportunityReportStatus.FAILED)
        self.client.force_authenticate(self.user)
        response = self.client.get(self.url, {"scenario": self.scenario.pk})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["status"], FundingOpportunityReportStatus.FAILED)

    def test_get_status_response_contains_expected_fields(self):
        self._create_report()
        self.client.force_authenticate(self.user)
        response = self.client.get(self.url, {"scenario": self.scenario.pk})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("id", data)
        self.assertIn("scenario", data)
        self.assertIn("status", data)
        self.assertNotIn("created_at", data)
        self.assertNotIn("updated_at", data)

    def test_get_status_requires_authentication(self):
        self._create_report()
        response = self.client.get(self.url, {"scenario": self.scenario.pk})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_status_with_nonexistent_scenario_returns_404(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(self.url, {"scenario": 999999})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_status_with_no_report_returns_404(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(self.url, {"scenario": self.scenario.pk})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
