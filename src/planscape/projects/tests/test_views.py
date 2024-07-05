from uuid import uuid4

from django.contrib.auth import get_user_model
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.test import TransactionTestCase
from django.urls import reverse
from projects.models import (
    Organization,
    Project,
    ProjectCapabilities,
    ProjectVisibility,
)
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


class ProjectViewSetTest(TransactionTestCase):
    def setUp(self):
        self.client = APIClient()
        self.organization = Organization.objects.create(
            name="Test Organization",
        )
        self.user = User.objects.create(username="testuser")
        self.public_project = Project.objects.create(
            uuid=uuid4(),
            organization=self.organization,
            created_by=self.user,
            name="Public Project",
            display_name="Public Project Display",
            capabilities=[ProjectCapabilities.EXPLORE],
            visibility=ProjectVisibility.PUBLIC,
            geometry=MultiPolygon(Polygon(((0, 0), (1, 0), (1, 1), (0, 1), (0, 0)))),
        )
        self.public_project2 = Project.objects.create(
            uuid=uuid4(),
            organization=self.organization,
            created_by=self.user,
            name="foobarbaz",
            display_name="Foo Bar Baz",
            capabilities=[
                ProjectCapabilities.EXPLORE,
                ProjectCapabilities.PLAN,
            ],
            visibility=ProjectVisibility.PUBLIC,
            geometry=MultiPolygon(
                Polygon(((0, 0), (1, 0), (1, 1), (0, 1), (0, 0))),
            ),
        )
        self.private_project = Project.objects.create(
            uuid=uuid4(),
            organization=self.organization,
            created_by=self.user,
            name="Private Project",
            display_name="Private Project Display",
            visibility=ProjectVisibility.PRIVATE,
            capabilities=[
                ProjectCapabilities.EXPLORE,
                ProjectCapabilities.PLAN,
            ],
            geometry=MultiPolygon(
                Polygon(((0, 0), (1, 0), (1, 1), (0, 1), (0, 0))),
            ),
        )

    def test_list_projects(self):
        url = reverse("api:projects:projects-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        project_names = [x.get("name") for x in data.get("results")]
        self.assertIn(self.public_project.name, project_names)
        self.assertNotIn(self.private_project.name, project_names)

    def test_retrieve_project(self):
        url = reverse(
            "api:projects:projects-detail",
            args=[self.public_project.uuid],
        )
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["name"], self.public_project.name)

    def test_retrieve_nonexistent_project(self):
        url = reverse(
            "api:projects:projects-detail",
            args=[str(uuid4())],
        )
        response = self.client.get(url)
        self.assertEqual(response.status_code, 404)

    def test_filter_by_name_exact(self):
        url = reverse("api:projects:projects-list")
        response = self.client.get(url, {"name": self.public_project.name})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data.get("results")), 1)
        self.assertEqual(response.data.get("count"), 1)
        self.assertEqual(
            response.data["results"][0]["name"],
            self.public_project.name,
        )

    def test_filter_by_name_contains(self):
        url = reverse("api:projects:projects-list")
        response = self.client.get(
            url,
            {"name__icontains": "project"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data.get("results")), 1)
        self.assertEqual(response.data.get("count"), 1)
        self.assertEqual(
            response.data["results"][0]["name"],
            self.public_project.name,
        )

    def test_filter_by_display_name_exact(self):
        url = reverse("api:projects:projects-list")
        response = self.client.get(
            url,
            {"display_name": self.public_project.display_name},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data.get("results")), 1)
        self.assertEqual(response.data.get("count"), 1)
        self.assertEqual(
            response.data["results"][0]["display_name"],
            self.public_project.display_name,
        )

    def test_filter_by_display_name_contains(self):
        url = reverse("api:projects:projects-list")
        response = self.client.get(
            url,
            {"display_name__icontains": "Display"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data.get("results")), 1)
        self.assertEqual(response.data.get("count"), 1)
        self.assertEqual(
            response.data["results"][0]["display_name"],
            self.public_project.display_name,
        )

    def test_filter_by_capabilities_explore(self):
        url = reverse("api:projects:projects-list")
        response = self.client.get(
            url,
            {"capabilities": "EXPLORE"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data.get("results")), 2)
        self.assertEqual(response.data.get("count"), 2)

    def test_filter_by_capabilities_plan(self):
        url = reverse("api:projects:projects-list")
        response = self.client.get(
            url,
            {"capabilities": "PLAN"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data.get("results")), 1)
        self.assertEqual(response.data.get("count"), 1)

    def test_filter_by_capabilities_both_plan(self):
        url = reverse("api:projects:projects-list")
        response = self.client.get(
            url,
            {"capabilities": "EXPLORE,PLAN"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # in here we have 1 project that is defined in the tests plus
        # 4 that are loaded view fixtures.
        self.assertEqual(len(response.data.get("results")), 1)
        self.assertEqual(response.data.get("count"), 1)
