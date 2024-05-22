from rest_framework.test import APIClient, APITransactionTestCase
from rest_framework import status
from django.urls import reverse
from django.contrib.gis.geos import MultiPolygon, Polygon
from metrics.models import Metric, Category, MetricCapabilities
from projects.models import Project, ProjectVisibility
from datasets.models import Dataset
from organizations.models import Organization
from django.contrib.auth import get_user_model

User = get_user_model()


class MetricsViewSetTest(APITransactionTestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser",
            password="12345",
        )
        self.client.force_authenticate(user=self.user)
        self.organization = Organization.objects.create(name="Test Org")
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.organization,
            geometry=MultiPolygon(
                Polygon(((0, 0), (1, 0), (1, 1), (0, 1), (0, 0))),
            ),
            visibility=ProjectVisibility.PUBLIC,
        )
        self.category = Category.add_root(
            name="Test Category",
            organization=self.organization,
            project=self.project,
            created_by=self.user,
        )
        self.dataset = Dataset.objects.create(
            name="Test Dataset",
            organization=self.organization,
            created_by=self.user,
            type="VECTOR",
            blob_status="READY",
            url="http://example.com/dataset",
        )
        self.metric = Metric.objects.create(
            project=self.project,
            dataset=self.dataset,
            category=self.category,
            name="Test Metric",
            display_name="Test Metric Display",
            created_by=self.user,
        )

    def test_list_metrics(self):
        response = self.client.get(reverse("metrics:metrics-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data.get("results")), 1)
        self.assertEqual(response.data.get("count"), 1)
        self.assertEqual(
            response.data.get("results")[0]["name"],
            self.metric.name,
        )

    def test_retrieve_metric(self):
        response = self.client.get(
            reverse("metrics:metrics-detail", args=[self.metric.uuid])
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], self.metric.name)
        self.assertEqual(
            response.data["display_name"],
            self.metric.display_name,
        )

    def test_filter_by_organization(self):
        url = reverse("metrics:metrics-list")
        response = self.client.get(
            url,
            {"organization": self.organization.uuid},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data.get("results")), 1)
        self.assertEqual(response.data.get("count"), 1)
        self.assertEqual(response.data["results"][0]["name"], self.metric.name)

    def test_filter_by_project(self):
        url = reverse("metrics:metrics-list")
        response = self.client.get(
            url,
            {"project": str(self.project.uuid)},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data.get("results")), 1)
        self.assertEqual(response.data.get("count"), 1)
        self.assertEqual(response.data["results"][0]["name"], self.metric.name)

    def test_filter_by_category(self):
        url = reverse("metrics:metrics-list")
        response = self.client.get(url, {"category": self.category.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data.get("results")), 1)
        self.assertEqual(response.data.get("count"), 1)
        self.assertEqual(response.data["results"][0]["name"], self.metric.name)

    def test_filter_by_capabilities(self):
        url = reverse("metrics:metrics-list")
        response = self.client.get(
            url,
            {"capabilities": MetricCapabilities.MAP_VIEW},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data.get("results")), 1)
        self.assertEqual(response.data.get("count"), 1)
        self.assertEqual(response.data["results"][0]["name"], self.metric.name)

    def test_filter_by_name_exact(self):
        url = reverse("metrics:metrics-list")
        response = self.client.get(url, {"name": "Test Metric"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data.get("results")), 1)
        self.assertEqual(response.data.get("count"), 1)
        self.assertEqual(response.data["results"][0]["name"], self.metric.name)

    def test_filter_by_name_contains(self):
        url = reverse("metrics:metrics-list")
        response = self.client.get(url, {"name__contains": "Test"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data.get("results")), 1)
        self.assertEqual(response.data.get("count"), 1)
        self.assertEqual(response.data["results"][0]["name"], self.metric.name)

    def test_filter_by_display_name_exact(self):
        url = reverse("metrics:metrics-list")
        response = self.client.get(
            url,
            {"display_name": "Test Metric Display"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data.get("results")), 1)
        self.assertEqual(response.data.get("count"), 1)
        self.assertEqual(
            response.data["results"][0]["display_name"],
            self.metric.display_name,
        )

    def test_filter_by_display_name_contains(self):
        url = reverse("metrics:metrics-list")
        response = self.client.get(url, {"display_name__contains": "Metric"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data.get("results")), 1)
        self.assertEqual(response.data.get("count"), 1)
        self.assertEqual(
            response.data["results"][0]["display_name"],
            self.metric.display_name,
        )
