from unittest import mock

from django.urls import reverse
from planning.tests.factories import PlanningAreaFactory, ScenarioFactory
from planscape.tests.factories import UserFactory
from rest_framework import status
from rest_framework.test import APITestCase

from funding_report.models import (
    FundingOpportunityReport,
    FundingOpportunityReportStatus,
)


class RunReportTest(APITestCase):
    def setUp(self):
        self.user = UserFactory.create()
        self.planning_area = PlanningAreaFactory.create(user=self.user)
        self.scenario = ScenarioFactory.create(
            user=self.user,
            planning_area=self.planning_area,
        )
        self.url = reverse("api:planning:scenarios-run-report", args=[self.scenario.pk])

    @mock.patch("planning.views_v2.run_funding_opportunity_report")
    def test_run_report_creates_report_and_returns_202(self, task_mock):
        self.client.force_authenticate(self.user)
        response = self.client.post(self.url, format="json")

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(FundingOpportunityReport.objects.count(), 1)
        report = FundingOpportunityReport.objects.get()
        self.assertEqual(report.scenario, self.scenario)
        self.assertEqual(report.created_by, self.user)
        task_mock.delay.assert_called_once_with(report.pk)

    @mock.patch("planning.views_v2.run_funding_opportunity_report")
    def test_run_report_reuses_existing_report(self, task_mock):
        existing = FundingOpportunityReport.objects.create(
            scenario=self.scenario,
            created_by=self.user,
        )
        self.client.force_authenticate(self.user)
        response = self.client.post(self.url, format="json")

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(FundingOpportunityReport.objects.count(), 1)
        task_mock.delay.assert_called_once_with(existing.pk)

    def test_run_report_requires_authentication(self):
        response = self.client.post(self.url, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @mock.patch("planning.views_v2.run_funding_opportunity_report")
    def test_run_report_response_contains_expected_fields(self, task_mock):
        self.client.force_authenticate(self.user)
        response = self.client.post(self.url, format="json")

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        data = response.json()
        self.assertIn("id", data)
        self.assertIn("scenario", data)
        self.assertIn("status", data)
        self.assertIn("created_at", data)
        self.assertIn("updated_at", data)
        self.assertIn("results", data)
        self.assertEqual(data["status"], FundingOpportunityReportStatus.PENDING)


class GetReportTest(APITestCase):
    def setUp(self):
        self.user = UserFactory.create()
        self.planning_area = PlanningAreaFactory.create(user=self.user)
        self.scenario = ScenarioFactory.create(
            user=self.user,
            planning_area=self.planning_area,
        )
        self.url = reverse("api:planning:scenarios-get-report", args=[self.scenario.pk])

    def _create_report(self, report_status=FundingOpportunityReportStatus.PENDING):
        return FundingOpportunityReport.objects.create(
            scenario=self.scenario,
            created_by=self.user,
            status=report_status,
            results={"summary": {}, "projects": {}},
        )

    def test_get_report_returns_report(self):
        self._create_report()
        self.client.force_authenticate(self.user)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["scenario"], self.scenario.pk)

    def test_get_report_reflects_current_status(self):
        self._create_report(FundingOpportunityReportStatus.RUNNING)
        self.client.force_authenticate(self.user)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.json()["status"], FundingOpportunityReportStatus.RUNNING
        )

    def test_get_report_response_contains_expected_fields(self):
        self._create_report()
        self.client.force_authenticate(self.user)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("id", data)
        self.assertIn("scenario", data)
        self.assertIn("status", data)
        self.assertIn("created_at", data)
        self.assertIn("updated_at", data)
        self.assertIn("created_by", data)
        self.assertIn("results", data)
        self.assertEqual(data["results"], {"summary": {}, "projects": {}})

    def test_get_report_requires_authentication(self):
        self._create_report()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_report_with_no_report_returns_404(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class AETImprovementTest(APITestCase):
    def setUp(self):
        self.user = UserFactory.create()
        self.planning_area = PlanningAreaFactory.create(user=self.user)
        self.scenario = ScenarioFactory.create(
            user=self.user,
            planning_area=self.planning_area,
        )
        self.url = reverse(
            "api:planning:scenarios-aet-improvement", args=[self.scenario.pk]
        )

    def test_aet_improvement_requires_successful_funding_report(self):
        FundingOpportunityReport.objects.create(
            scenario=self.scenario,
            created_by=self.user,
            status=FundingOpportunityReportStatus.RUNNING,
        )
        self.client.force_authenticate(self.user)

        response = self.client.post(self.url, {"percentage": 15}, format="json")

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_aet_improvement_requires_existing_funding_report(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(self.url, {"percentage": 15}, format="json")

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    @mock.patch("planning.views_v2.calculate_aet_improvement")
    def test_aet_improvement_returns_results_after_successful_report(
        self, calculate_mock
    ):
        report = FundingOpportunityReport.objects.create(
            scenario=self.scenario,
            created_by=self.user,
            status=FundingOpportunityReportStatus.SUCCESS,
        )
        calculate_mock.return_value = {
            "percentage": 15,
            "improved_acres": 12.5,
            "total_project_area_acres": 100,
            "improved_area_percent": 12.5,
        }
        self.client.force_authenticate(self.user)

        response = self.client.post(self.url, {"percentage": 15}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["improved_acres"], 12.5)
        calculate_mock.assert_called_once_with(report=report, percentage=15.0)

    def test_aet_improvement_validates_percentage(self):
        FundingOpportunityReport.objects.create(
            scenario=self.scenario,
            created_by=self.user,
            status=FundingOpportunityReportStatus.SUCCESS,
        )
        self.client.force_authenticate(self.user)

        response = self.client.post(self.url, {"percentage": -1}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
