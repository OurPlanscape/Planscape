from unittest import mock
from uuid import uuid4

from collaboration.models import Permissions, Role
from collaboration.tests.factories import UserObjectRoleFactory
from django.urls import reverse
from planning.tests.factories import (
    PlanningAreaFactory,
    ProjectAreaFactory,
    ScenarioFactory,
)
from planscape.tests.factories import UserFactory
from rest_framework import status
from rest_framework.test import APITestCase

from funding_report.models import (
    FundingOpportunityReport,
    FundingOpportunityReportInvite,
    FundingOpportunityReportRun,
    FundingOpportunityReportSharedLink,
    FundingOpportunityReportStatus,
)
from funding_report.tests.factories import (
    FundingOpportunityReportFactory,
    FundingOpportunityReportInviteFactory,
    FundingOpportunityReportSharedLinkFactory,
)


def _create_scenario_role_permissions():
    for role in [Role.OWNER, Role.COLLABORATOR, Role.VIEWER]:
        Permissions.objects.get_or_create(
            role=role,
            permission="view_planningarea",
        )
        Permissions.objects.get_or_create(
            role=role,
            permission="view_scenario",
        )

    for role in [Role.OWNER, Role.COLLABORATOR]:
        Permissions.objects.get_or_create(
            role=role,
            permission="change_scenario",
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
        _create_scenario_role_permissions()

    def _share_planning_area(self, user, role):
        return UserObjectRoleFactory(
            inviter=self.user,
            collaborator=user,
            email=user.email,
            role=role,
            associated_model=self.planning_area,
        )

    @mock.patch("planning.views_v2.run_funding_opportunity_report")
    def test_run_report_creates_report_and_returns_202(self, task_mock):
        self.client.force_authenticate(self.user)
        response = self.client.post(self.url, format="json")

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(FundingOpportunityReport.objects.count(), 1)

        report = FundingOpportunityReport.objects.get()
        self.assertEqual(report.scenario, self.scenario)
        self.assertEqual(report.created_by, self.user)

        report_run = FundingOpportunityReportRun.objects.get()
        self.assertEqual(report_run.report, report)
        self.assertEqual(report_run.user, self.user)
        self.assertEqual(report_run.email, self.user.email)

        task_mock.delay.assert_called_once_with(report.pk)

    @mock.patch("planning.views_v2.run_funding_opportunity_report")
    def test_run_report_reuses_existing_report_and_tracks_new_run(self, task_mock):
        existing = FundingOpportunityReport.objects.create(
            scenario=self.scenario,
            created_by=self.user,
        )

        self.client.force_authenticate(self.user)
        response = self.client.post(self.url, format="json")

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(FundingOpportunityReport.objects.count(), 1)
        self.assertEqual(FundingOpportunityReportRun.objects.count(), 1)

        report_run = FundingOpportunityReportRun.objects.get()
        self.assertEqual(report_run.report, existing)
        self.assertEqual(report_run.user, self.user)
        self.assertEqual(report_run.email, self.user.email)

        task_mock.delay.assert_called_once_with(existing.pk)

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

    @mock.patch("planning.views_v2.run_funding_opportunity_report")
    def test_run_report_allows_owner_role(self, task_mock):
        owner = UserFactory.create()
        self._share_planning_area(owner, Role.OWNER)

        self.client.force_authenticate(owner)
        response = self.client.post(self.url, format="json")

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

        report = FundingOpportunityReport.objects.get()
        self.assertEqual(report.scenario, self.scenario)
        self.assertEqual(report.created_by, owner)

        task_mock.delay.assert_called_once_with(report.pk)

    @mock.patch("planning.views_v2.run_funding_opportunity_report")
    def test_run_report_allows_collaborator(self, task_mock):
        collaborator = UserFactory.create()
        self._share_planning_area(collaborator, Role.COLLABORATOR)

        self.client.force_authenticate(collaborator)
        response = self.client.post(self.url, format="json")

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

        report = FundingOpportunityReport.objects.get()
        self.assertEqual(report.scenario, self.scenario)
        self.assertEqual(report.created_by, collaborator)

        task_mock.delay.assert_called_once_with(report.pk)

    @mock.patch("planning.views_v2.run_funding_opportunity_report")
    def test_run_report_denies_viewer(self, task_mock):
        viewer = UserFactory.create()
        self._share_planning_area(viewer, Role.VIEWER)

        self.client.force_authenticate(viewer)
        response = self.client.post(self.url, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(FundingOpportunityReport.objects.count(), 0)
        task_mock.delay.assert_not_called()


class GetReportTest(APITestCase):
    def setUp(self):
        self.user = UserFactory.create()
        self.planning_area = PlanningAreaFactory.create(user=self.user)
        self.scenario = ScenarioFactory.create(
            user=self.user,
            planning_area=self.planning_area,
        )
        self.url = reverse("api:planning:scenarios-get-report", args=[self.scenario.pk])
        _create_scenario_role_permissions()

    def _share_planning_area(self, user, role):
        return UserObjectRoleFactory(
            inviter=self.user,
            collaborator=user,
            email=user.email,
            role=role,
            associated_model=self.planning_area,
        )

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

    def test_get_report_allows_owner_role(self):
        self._create_report()

        owner = UserFactory.create()
        self._share_planning_area(owner, Role.OWNER)

        self.client.force_authenticate(owner)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["scenario"], self.scenario.pk)

    def test_get_report_allows_collaborator(self):
        self._create_report()

        collaborator = UserFactory.create()
        self._share_planning_area(collaborator, Role.COLLABORATOR)

        self.client.force_authenticate(collaborator)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["scenario"], self.scenario.pk)

    def test_get_report_allows_viewer(self):
        self._create_report()

        viewer = UserFactory.create()
        self._share_planning_area(viewer, Role.VIEWER)

        self.client.force_authenticate(viewer)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["scenario"], self.scenario.pk)


class FundingOpportunityReportPublicUrlTest(APITestCase):
    def setUp(self):
        self.user = UserFactory.create()
        self.planning_area = PlanningAreaFactory.create(user=self.user)
        self.scenario = ScenarioFactory.create(
            user=self.user,
            planning_area=self.planning_area,
        )
        self.url = reverse(
            "api:planning:scenarios-funding-opportunity-report-public-url",
            args=[self.scenario.pk],
        )
        self.query_params = {
            "aet": 10,
            "total_flame_severity": "high",
        }
        _create_scenario_role_permissions()
        self.report = FundingOpportunityReportFactory(
            scenario=self.scenario,
            created_by=self.user,
        )

    def test_requires_authentication(self):
        response = self.client.get(self.url, self.query_params)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_requires_required_query_params(self):
        self.client.force_authenticate(self.user)

        response = self.client.get(self.url, {"aet": 10})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("total_flame_severity", response.json().get("errors"))

    def test_requires_integer_aet_query_param(self):
        self.client.force_authenticate(self.user)

        response = self.client.get(
            self.url,
            {"aet": "not-an-integer", "total_flame_severity": "high"},
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("aet", response.json().get("errors"))

    def test_returns_404_when_report_does_not_exist(self):
        self.client.force_authenticate(self.user)

        scenario_wo_report = ScenarioFactory.create(
            user=self.user,
        )

        url = reverse(
            "api:planning:scenarios-funding-opportunity-report-public-url",
            args=[scenario_wo_report.pk],
        )
        response = self.client.get(url, self.query_params)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_creates_shared_link_and_returns_public_url(self):
        FundingOpportunityReportInviteFactory(
            report=self.report,
            inviter=self.user,
            invitee_email="first@example.com",
        )
        deleted_invite = FundingOpportunityReportInviteFactory(
            report=self.report,
            inviter=self.user,
            invitee_email="deleted@example.com",
        )
        deleted_invite.delete()
        self.client.force_authenticate(self.user)

        response = self.client.get(self.url, self.query_params)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(FundingOpportunityReportSharedLink.objects.count(), 1)
        shared_link = FundingOpportunityReportSharedLink.objects.get()
        self.assertEqual(shared_link.report, self.report)
        self.assertEqual(shared_link.configuration, self.query_params)
        self.assertEqual(response.json(), {"public_url": shared_link.get_public_url()})

    def test_reuses_existing_shared_link_for_same_configuration(self):
        shared_link = FundingOpportunityReportSharedLinkFactory(
            report=self.report,
            configuration=self.query_params,
        )
        FundingOpportunityReportInviteFactory(report=self.report, inviter=self.user)
        self.client.force_authenticate(self.user)

        response = self.client.get(self.url, self.query_params)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(FundingOpportunityReportSharedLink.objects.count(), 1)
        self.assertEqual(response.json(), {"public_url": shared_link.get_public_url()})

    def test_creates_new_shared_link_for_different_configuration(self):
        FundingOpportunityReportSharedLinkFactory(
            report=self.report,
            configuration={"aet": 5, "total_flame_severity": "medium"},
        )
        self.client.force_authenticate(self.user)

        response = self.client.get(self.url, self.query_params)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(FundingOpportunityReportSharedLink.objects.count(), 2)
        self.assertTrue(
            FundingOpportunityReportSharedLink.objects.filter(
                report=self.report,
                configuration=self.query_params,
            ).exists()
        )

    def test_allows_viewer_with_scenario_access(self):
        viewer = UserFactory.create()
        UserObjectRoleFactory(
            inviter=self.user,
            collaborator=viewer,
            email=viewer.email,
            role=Role.VIEWER,
            associated_model=self.planning_area,
        )
        self.client.force_authenticate(viewer)

        response = self.client.get(self.url, self.query_params)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(list(response.json().keys()), ["public_url"])


class PublicFundingOpportunityReportTest(APITestCase):
    def setUp(self):
        self.report = FundingOpportunityReportFactory(
            results={
                "summary": {
                    "AET": {
                        "percentage": 10,
                        "improved_acres": 12.5,
                        "total_project_area_acres": 100,
                        "planning_area_acres": 500,
                        "improved_area_percent": 2.5,
                    },
                    "ABOVEGROUND_TOTAL": [
                        {"year": 2026, "value": 20, "baseline": 10, "delta": 100}
                    ],
                    "TOTAL_FLAME_SEVERITY": {
                        "high": [
                            {"year": 2026, "value": 30, "baseline": 100, "delta": 30}
                        ],
                        "medium": [
                            {"year": 2026, "value": 50, "baseline": 100, "delta": 50}
                        ],
                    },
                },
                "projects": {
                    "AET": [
                        {
                            "project_id": 1,
                            "improved_acres": 12.5,
                            "total_acres": 100,
                            "improved_area_percent": 12.5,
                        }
                    ],
                    "ABOVEGROUND_TOTAL": [
                        {
                            "project_id": 1,
                            "year": 2026,
                            "value": 20,
                            "baseline": 10,
                            "delta": 100,
                        }
                    ],
                    "TOTAL_FLAME_SEVERITY": {
                        "high": [
                            {
                                "project_id": 1,
                                "year": 2026,
                                "value": 30,
                                "baseline": 100,
                                "delta": 30,
                            }
                        ],
                        "medium": [
                            {
                                "project_id": 1,
                                "year": 2026,
                                "value": 50,
                                "baseline": 100,
                                "delta": 50,
                            }
                        ],
                    },
                },
                "treatment_areas": {"total": {"No Treatment": 10}},
            }
        )
        self.shared_link = FundingOpportunityReportSharedLinkFactory(
            report=self.report,
            configuration={"aet": 10, "total_flame_severity": "high"},
        )
        self.url = reverse(
            "api:funding_report:public-funding-opportunity-report",
            args=[self.shared_link.uuid],
        )

    @mock.patch("funding_report.serializers.calculate_aet_improvement", return_value={
        "percentage": 24.0,
        "improved_acres": 1378.1362965456294,
        "total_project_area_acres": 6721.266454490802,
        "planning_area_acres": 230987.77520892292,
        "improved_area_percent": 0.5966273735911514,
        "project_areas": [
            {
                "project_id": 1,
                "improved_acres": 1373.7014001862415,
                "total_acres": 2668.738151049111,
                "improved_area_percent": 51.473817303740496
            },
            
        ]
    })
    def test_public_get_returns_report_without_authentication(self, calculate_aet_improvement_mock):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["scenario_name"], self.report.scenario.name)
        self.assertEqual(data["creator"], f"{self.report.created_by.first_name} {self.report.created_by.last_name}")
        self.assertEqual(data["status"], self.report.status)
        self.assertEqual(data["treatment_datalayer"], self.report.treatment_datalayer)
        self.assertEqual(data["aet_datalayer"], self.report.aet_datalayer)
        self.assertEqual(data["shared_configuration"], self.shared_link.configuration)
        self.assertEqual(data["geopackage_status"], self.report.geopackage_status)
        self.assertEqual(data["geopackage_url"], self.report.get_geopackage_url())
        self.assertEqual(
            data["results"]["summary"]["AET"],
            {
                "percentage": 24.0,
                "improved_acres": 1378.1362965456294,
                "total_project_area_acres": 6721.266454490802,
                "planning_area_acres": 230987.77520892292,
                "improved_area_percent": 0.5966273735911514,
            }
        )
        self.assertEqual(
            data["results"]["summary"]["TOTAL_FLAME_SEVERITY"], 
            {
                "high": 
                [
                    {"year": 2026, "value": 30, "baseline": 100, "delta": 30}
                ]
            }
        )
        self.assertEqual(
            data["results"]["projects"]["AET"],
            [{
                "project_id": 1,
                "improved_acres": 1373.7014001862415,
                "total_acres": 2668.738151049111,
                "improved_area_percent": 51.473817303740496
            }]
        )
        self.assertEqual(
            data["results"]["projects"]["TOTAL_FLAME_SEVERITY"], 
            {
                "high": 
                [
                    {
                        "project_id": 1,
                        "year": 2026,
                        "value": 30,
                        "baseline": 100,
                        "delta": 30,
                    }
                ]
            }
        )
        calculate_aet_improvement_mock.assert_called_once()

    def test_returns_404_for_unknown_uuid(self):
        url = reverse(
            "api:funding_report:public-funding-opportunity-report", args=[uuid4()]
        )

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_returns_404_for_deleted_shared_link(self):
        self.shared_link.delete()

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class PublicFundingOpportunityReportProjectAreasTest(APITestCase):
    def setUp(self):
        self.report = FundingOpportunityReportFactory()
        self.shared_link = FundingOpportunityReportSharedLinkFactory(
            report=self.report,
            configuration={"aet": 10, "total_flame_severity": "high"},
        )
        self.url = reverse(
            "api:funding_report:public-funding-opportunity-report-project-areas",
            args=[self.shared_link.uuid],
        )

    def test_public_get_returns_project_areas_without_authentication(self):
        project_area = ProjectAreaFactory(
            scenario=self.report.scenario,
            name="Shared project area",
            data={"treatment_rank": 1},
        )
        ProjectAreaFactory(scenario=self.report.scenario, data={"treatment_rank": 2})
        ProjectAreaFactory()

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 2)
        self.assertIn(project_area.name, [item["name"] for item in data])
        serialized_project_area = next(
            item for item in data if item["name"] == project_area.name
        )
        self.assertEqual(serialized_project_area["data"], project_area.data)
        self.assertEqual(serialized_project_area["treatment_rank"], 1)
        for item in data:
            self.assertIn("geometry", item)
            self.assertIn("treatment_rank", item)
            self.assertNotIn("id", item)
            self.assertNotIn("scenario", item)
            self.assertNotIn("created_by", item)

    def test_returns_404_for_unknown_uuid(self):
        url = reverse(
            "api:funding_report:public-funding-opportunity-report-project-areas",
            args=[uuid4()],
        )

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_returns_404_for_deleted_shared_link(self):
        self.shared_link.delete()

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class CreateFundingOpportunityReportInvitesTest(APITestCase):
    def setUp(self):
        self.user = UserFactory.create()
        self.planning_area = PlanningAreaFactory.create(user=self.user)
        self.scenario = ScenarioFactory.create(
            user=self.user,
            planning_area=self.planning_area,
        )
        self.url = reverse(
            "api:planning:scenarios-create-funding-opportunity-report-invites",
            args=[self.scenario.pk],
        )
        _create_scenario_role_permissions()
        self.report = FundingOpportunityReportFactory(
            scenario=self.scenario,
            created_by=self.user,
        )
        self.payload = {
            "emails": ["First@Example.com", "second@example.com", "first@example.com"],
            "aet": 10,
            "total_flame_severity": "high",
            "resent_to_all_invitees": False,
        }

    def test_requires_authentication(self):
        response = self.client.post(self.url, self.payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_requires_authentication(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_returns_invite_emails_without_public_url(self):
        invite_1 = FundingOpportunityReportInviteFactory(
            report=self.report,
            inviter=self.user,
            invitee_email="first@example.com",
        )
        invite_2 = FundingOpportunityReportInviteFactory(
            report=self.report,
            inviter=self.user,
            invitee_email="second@example.com",
        )
        deleted_invite = FundingOpportunityReportInviteFactory(
            report=self.report,
            inviter=self.user,
            invitee_email="deleted@example.com",
        )
        deleted_invite.delete()
        self.client.force_authenticate(self.user)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertCountEqual(
            response.json()["emails"],
            [invite_1.invitee_email, invite_2.invitee_email],
        )
        self.assertNotIn("public_url", response.json())

    def test_get_returns_404_when_report_does_not_exist(self):
        scenario_wo_report = ScenarioFactory.create(user=self.user)
        url = reverse(
            "api:planning:scenarios-create-funding-opportunity-report-invites",
            args=[scenario_wo_report.pk],
        )
        self.client.force_authenticate(self.user)

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_requires_required_fields(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(
            self.url,
            {"emails": ["first@example.com"], "aet": 10},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("total_flame_severity", response.json().get("errors"))

    def test_requires_resent_to_all_invitees_field(self):
        self.client.force_authenticate(self.user)

        payload = {
            "emails": ["first@example.com"],
            "aet": 10,
            "total_flame_severity": "high",
        }
        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("resent_to_all_invitees", response.json().get("errors"))

    def test_returns_404_when_report_does_not_exist(self):
        scenario_wo_report = ScenarioFactory.create(user=self.user)
        url = reverse(
            "api:planning:scenarios-create-funding-opportunity-report-invites",
            args=[scenario_wo_report.pk],
        )
        self.client.force_authenticate(self.user)

        response = self.client.post(url, self.payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @mock.patch("planning.views_v2.send_funding_opportunity_report_shared_link")
    def test_creates_invites_shared_link_and_sends_emails(self, task_mock):
        self.client.force_authenticate(self.user)

        response = self.client.post(self.url, self.payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(FundingOpportunityReportInvite.objects.count(), 2)
        self.assertCountEqual(
            FundingOpportunityReportInvite.objects.values_list(
                "invitee_email",
                flat=True,
            ),
            ["first@example.com", "second@example.com"],
        )
        self.assertEqual(FundingOpportunityReportSharedLink.objects.count(), 1)
        shared_link = FundingOpportunityReportSharedLink.objects.get()
        self.assertEqual(
            shared_link.configuration,
            {"aet": 10, "total_flame_severity": "high"},
        )
        self.assertEqual(
            response.json(),
            {"emails": ["first@example.com", "second@example.com"]},
        )
        self.assertEqual(task_mock.delay.call_count, 2)
        self.assertCountEqual(
            [call.args[0] for call in task_mock.delay.call_args_list],
            ["first@example.com", "second@example.com"],
        )

    @mock.patch("planning.views_v2.send_funding_opportunity_report_shared_link")
    def test_reuses_existing_invite_and_shared_link(self, task_mock):
        FundingOpportunityReportInviteFactory(
            report=self.report,
            inviter=self.user,
            invitee_email="first@example.com",
        )
        FundingOpportunityReportSharedLinkFactory(
            report=self.report,
            configuration={"aet": 10, "total_flame_severity": "high"},
        )
        self.client.force_authenticate(self.user)

        response = self.client.post(self.url, self.payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(FundingOpportunityReportInvite.objects.count(), 2)
        self.assertEqual(FundingOpportunityReportSharedLink.objects.count(), 1)
        self.assertEqual(
            response.json(),
            {"emails": ["first@example.com", "second@example.com"]},
        )
        self.assertEqual(task_mock.delay.call_count, 2)

    @mock.patch("planning.views_v2.send_funding_opportunity_report_shared_link")
    def test_sends_to_all_active_invitees_when_resent_to_all_invitees_is_true(
        self, task_mock
    ):
        FundingOpportunityReportInviteFactory(
            report=self.report,
            inviter=self.user,
            invitee_email="existing@example.com",
        )
        deleted_invite = FundingOpportunityReportInviteFactory(
            report=self.report,
            inviter=self.user,
            invitee_email="deleted@example.com",
        )
        deleted_invite.delete()
        self.payload["resent_to_all_invitees"] = True
        self.client.force_authenticate(self.user)

        response = self.client.post(self.url, self.payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            response.json(),
            {"emails": ["first@example.com", "second@example.com"]},
        )
        self.assertCountEqual(
            [call.args[0] for call in task_mock.delay.call_args_list],
            ["first@example.com", "second@example.com", "existing@example.com"],
        )

    @mock.patch("planning.views_v2.send_funding_opportunity_report_shared_link")
    def test_resend_to_all_deduplicates_existing_invite_emails(self, task_mock):
        FundingOpportunityReportInviteFactory(
            report=self.report,
            inviter=self.user,
            invitee_email="first@example.com",
        )
        self.payload["resent_to_all_invitees"] = True
        self.client.force_authenticate(self.user)

        response = self.client.post(self.url, self.payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertCountEqual(
            [call.args[0] for call in task_mock.delay.call_args_list],
            ["first@example.com", "second@example.com"],
        )


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
            "planning_area_acres": 500,
            "improved_area_percent": 2.5,
            "project_areas": [
                {
                    "project_id": 1,
                    "improved_acres": 12.5,
                    "total_acres": 100,
                    "improved_area_percent": 12.5,
                }
            ],
        }
        self.client.force_authenticate(self.user)

        response = self.client.post(self.url, {"percentage": 15}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["improved_acres"], 12.5)
        self.assertEqual(response.json()["planning_area_acres"], 500)
        self.assertEqual(len(response.json()["project_areas"]), 1)
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

    @mock.patch("planning.views_v2.calculate_aet_improvement")
    def test_aet_improvement_returns_400_on_value_error(self, calculate_mock):
        FundingOpportunityReport.objects.create(
            scenario=self.scenario,
            created_by=self.user,
            status=FundingOpportunityReportStatus.SUCCESS,
        )
        calculate_mock.side_effect = ValueError(
            "Missing funding report AET delta datalayer."
        )
        self.client.force_authenticate(self.user)

        response = self.client.post(self.url, {"percentage": 15}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.json())


class FlameLengthReductionTest(APITestCase):
    def setUp(self):
        self.user = UserFactory.create()
        self.planning_area = PlanningAreaFactory.create(user=self.user)
        self.scenario = ScenarioFactory.create(
            user=self.user,
            planning_area=self.planning_area,
        )
        self.url = reverse(
            "api:planning:scenarios-flame-length-reduction", args=[self.scenario.pk]
        )

    def test_flame_length_reduction_requires_successful_funding_report(self):
        FundingOpportunityReport.objects.create(
            scenario=self.scenario,
            created_by=self.user,
            status=FundingOpportunityReportStatus.RUNNING,
        )
        self.client.force_authenticate(self.user)

        response = self.client.post(self.url, {"from_ft": 7, "to_ft": 4}, format="json")

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_flame_length_reduction_requires_existing_funding_report(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(self.url, {"from_ft": 7, "to_ft": 4}, format="json")

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_flame_length_reduction_validates_required_fields(self):
        FundingOpportunityReport.objects.create(
            scenario=self.scenario,
            created_by=self.user,
            status=FundingOpportunityReportStatus.SUCCESS,
        )
        self.client.force_authenticate(self.user)

        response = self.client.post(self.url, {"from_ft": 7}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_flame_length_reduction_rejects_from_less_than_or_equal_to_to(self):
        FundingOpportunityReport.objects.create(
            scenario=self.scenario,
            created_by=self.user,
            status=FundingOpportunityReportStatus.SUCCESS,
        )
        self.client.force_authenticate(self.user)

        for from_ft, to_ft in [(4, 7), (4, 4)]:
            with self.subTest(from_ft=from_ft, to_ft=to_ft):
                response = self.client.post(
                    self.url, {"from_ft": from_ft, "to_ft": to_ft}, format="json"
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @mock.patch("planning.views_v2.calculate_funding_report_flame_length_reduction")
    def test_flame_length_reduction_returns_results_after_successful_report(
        self, calculate_mock
    ):
        report = FundingOpportunityReport.objects.create(
            scenario=self.scenario,
            created_by=self.user,
            status=FundingOpportunityReportStatus.SUCCESS,
        )
        calculate_mock.return_value = {
            "interval": {"from": 7.0, "to": 4.0},
            "summary": [
                {
                    "year": 2026,
                    "value": 10,
                    "baseline": 100,
                    "delta": 10.0,
                }
            ],
            "projects": [
                {
                    "project_id": 1,
                    "proj_id": None,
                    "year": 2026,
                    "value": 10,
                    "baseline": 100,
                    "delta": 10.0,
                }
            ],
        }
        self.client.force_authenticate(self.user)

        response = self.client.post(self.url, {"from_ft": 7, "to_ft": 4}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), calculate_mock.return_value)
        calculate_mock.assert_called_once_with(report=report, from_ft=7.0, to_ft=4.0)

    @mock.patch("planning.views_v2.calculate_funding_report_flame_length_reduction")
    def test_flame_length_reduction_returns_400_on_value_error(self, calculate_mock):
        FundingOpportunityReport.objects.create(
            scenario=self.scenario,
            created_by=self.user,
            status=FundingOpportunityReportStatus.SUCCESS,
        )
        calculate_mock.side_effect = ValueError(
            "Missing funding report datalayer for variable="
            "'TOTAL_FLAME_SEVERITY', year=2026."
        )
        self.client.force_authenticate(self.user)

        response = self.client.post(self.url, {"from_ft": 7, "to_ft": 4}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.json())
