from uuid import uuid4
from django.test import TransactionTestCase
from rest_framework.test import APIClient
from django.urls import reverse
from projects.models import Project, Organization, ProjectVisibility
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.contrib.auth import get_user_model

User = get_user_model()


class ProjectViewSetTest(TransactionTestCase):
    def setUp(self):
        self.client = APIClient()
        self.organization = Organization.objects.create(name="Test Organization")
        self.user = User.objects.create(username="testuser")
        self.public_project = Project.objects.create(
            uuid=uuid4(),
            organization=self.organization,
            created_by=self.user,
            name="Public Project",
            display_name="Public Project Display",
            visibility=ProjectVisibility.PUBLIC,
            geometry=MultiPolygon(Polygon(((0, 0), (1, 0), (1, 1), (0, 1), (0, 0)))),
        )
        self.private_project = Project.objects.create(
            uuid=uuid4(),
            organization=self.organization,
            created_by=self.user,
            name="Private Project",
            display_name="Private Project Display",
            visibility=ProjectVisibility.PRIVATE,
            geometry=MultiPolygon(Polygon(((0, 0), (1, 0), (1, 1), (0, 1), (0, 0)))),
        )

    def test_list_projects(self):
        url = reverse("projects:projects-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        project_names = [x.get("name") for x in data.get("results")]
        self.assertIn(self.public_project.name, project_names)
        self.assertNotIn(self.private_project.name, project_names)

    def test_retrieve_project(self):
        url = reverse(
            "projects:projects-detail",
            args=[self.public_project.uuid],
        )
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["name"], self.public_project.name)

    def test_retrieve_nonexistent_project(self):
        url = reverse(
            "projects:projects-detail",
            args=[str(uuid4())],
        )
        response = self.client.get(url)
        self.assertEqual(response.status_code, 404)
