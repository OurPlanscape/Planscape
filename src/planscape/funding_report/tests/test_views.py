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
        response = self.client.post(
            self.url, {"scenario": self.scenario.pk}, format="json"
        )

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
        response = self.client.post(
            self.url, {"scenario": self.scenario.pk}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(FundingOpportunityReport.objects.count(), 1)
        task_mock.delay.assert_called_once_with(existing.pk)

    def test_run_requires_authentication(self):
        response = self.client.post(
            self.url, {"scenario": self.scenario.pk}, format="json"
        )
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
        response = self.client.post(
            self.url, {"scenario": self.scenario.pk}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        data = response.json()
        self.assertIn("id", data)
        self.assertIn("scenario", data)
        self.assertIn("status", data)
        self.assertIn("created_at", data)
        self.assertIn("updated_at", data)
        self.assertEqual(data["status"], FundingOpportunityReportStatus.PENDING)


class RetrieveFundingOpportunityReportTest(APITestCase):
    def setUp(self):
        self.user = UserFactory.create()
        self.planning_area = PlanningAreaFactory.create(user=self.user)
        self.scenario = ScenarioFactory.create(
            user=self.user,
            planning_area=self.planning_area,
        )
        self.report = FundingOpportunityReport.objects.create(
            scenario=self.scenario,
            created_by=self.user,
        )
        self.url = reverse(
            "api:funding_report:funding-opportunity-reports-detail",
            args=[self.report.pk],
        )

    def test_retrieve_returns_report(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["id"], self.report.pk)
        self.assertEqual(data["scenario"], self.scenario.pk)
        self.assertEqual(data["status"], FundingOpportunityReportStatus.PENDING)

    def test_retrieve_response_contains_expected_fields(self):
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

    def test_retrieve_requires_authentication(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_retrieve_nonexistent_returns_404(self):
        self.client.force_authenticate(self.user)
        url = reverse(
            "api:funding_report:funding-opportunity-reports-detail",
            args=[999999],
        )
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
