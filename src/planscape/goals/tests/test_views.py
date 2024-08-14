from rest_framework.test import APIClient, APITransactionTestCase
from rest_framework import status
from django.urls import reverse
from django.contrib.gis.geos import MultiPolygon, Polygon
from goals.models import (
    TreatmentGoal,
    MetricUsage,
    MetricUsageType,
    MetricAttribute,
    PreProcessingFunction,
    PostProcessingFunction,
)
from metrics.models import Metric, Category
from projects.models import Project, ProjectVisibility
from datasets.models import Dataset
from organizations.models import Organization
from django.contrib.auth import get_user_model

User = get_user_model()


class TreatmentGoalViewSetTest(APITransactionTestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser",
            password="12345",
        )
        self.client.force_authenticate(user=self.user)
        self.organization = Organization.objects.create(name="Test Org")
        self.organization2 = Organization.objects.create(name="Test Org 2")
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.organization,
            geometry=MultiPolygon(
                Polygon(((0, 0), (1, 0), (1, 1), (0, 1), (0, 0))),
            ),
            visibility=ProjectVisibility.PUBLIC,
        )
        self.project2 = Project.objects.create(
            name="Test 2",
            organization=self.organization2,
            geometry=MultiPolygon(
                Polygon(((0, 0), (1, 0), (1, 1), (0, 1), (0, 0))),
            ),
            visibility=ProjectVisibility.PUBLIC,
        )
        self.project3 = Project.objects.create(
            name="Test 2",
            organization=self.organization2,
            geometry=MultiPolygon(
                Polygon(((0, 0), (1, 0), (1, 1), (0, 1), (0, 0))),
            ),
            visibility=ProjectVisibility.PRIVATE,
        )
        self.category = Category.add_root(
            name="Test Category",
            organization=self.organization,
            project=self.project,
            created_by=self.user,
        )
        self.category2 = Category.add_root(
            name="Test Category",
            organization=self.organization2,
            project=self.project2,
            created_by=self.user,
        )
        self.category3 = Category.add_root(
            name="Test Category",
            organization=self.organization2,
            project=self.project3,
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
        self.dataset2 = Dataset.objects.create(
            name="Test Dataset",
            organization=self.organization2,
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
        self.metric2 = Metric.objects.create(
            project=self.project2,
            dataset=self.dataset2,
            category=self.category2,
            name="Test Metric",
            display_name="Test Metric Display",
            created_by=self.user,
        )
        # must not show up because the viewset
        # defines filter for PUBLIC projects only.
        self.metric3 = Metric.objects.create(
            project=self.project3,
            dataset=self.dataset2,
            category=self.category3,
            name="Test Metric",
            display_name="Test Metric Display",
            created_by=self.user,
        )
        self.goal = TreatmentGoal.objects.create(
            created_by=self.user,
            project=self.project,
            name="my goal 1",
            summary="brief description",
            description="long description",
        )
        self.goal2 = TreatmentGoal.objects.create(
            created_by=self.user,
            project=self.project2,
            name="my goal 2",
            summary="brief description",
            description="long description",
        )
        self.usage = MetricUsage.objects.create(
            treatment_goal=self.goal,
            metric=self.metric,
            type=MetricUsageType.PRIORITY,
            attribute=MetricAttribute.MAJORITY,
            pre_processing=PreProcessingFunction.NONE,
            post_processing=PostProcessingFunction.PROJECT_AREA_SUM,
            output_units="Acres per Project",
        )
        self.usage2 = MetricUsage.objects.create(
            treatment_goal=self.goal2,
            metric=self.metric,
            type=MetricUsageType.PRIORITY,
            attribute=MetricAttribute.MAJORITY,
            pre_processing=PreProcessingFunction.NONE,
            post_processing=PostProcessingFunction.PROJECT_AREA_SUM,
            output_units="Acres per Project",
        )

    def test_list_goals(self):
        response = self.client.get(reverse("api:goals:treatment_goals-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data.get("results")), 2)
        self.assertEqual(response.data.get("count"), 2)

    def test_retrieve_goal(self):
        response = self.client.get(
            reverse(
                "api:goals:treatment_goals-detail",
                kwargs={"pk": self.goal.pk},
            )
        )
        data = response.json()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(data["name"], self.goal.name)
        self.assertEqual(len(data["metric_usages"]), 1)
        usage = data["metric_usages"][0]
        self.assertEqual(usage["metric"]["name"], self.metric.name)
        self.assertEqual(usage["dataset"]["name"], self.dataset.name)
        self.assertEqual(usage["output_units"], "Acres per Project")

    def test_filter_by_organization(self):
        url = reverse("api:goals:treatment_goals-list")
        response = self.client.get(
            url,
            {"organization": self.organization.id},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data.get("results")), 1)
        self.assertEqual(response.data.get("count"), 1)
        self.assertEqual(response.data["results"][0]["name"], self.goal.name)

    def test_filter_by_project(self):
        url = reverse("api:goals:treatment_goals-list")
        response = self.client.get(
            url,
            {"project": self.project.id},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data.get("results")), 1)
        self.assertEqual(response.data.get("count"), 1)
        self.assertEqual(response.data["results"][0]["name"], self.goal.name)

    def test_filter_by_name_exact(self):
        url = reverse("api:goals:treatment_goals-list")
        response = self.client.get(url, {"name": "my goal 1"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data.get("results")), 1)
        self.assertEqual(response.data.get("count"), 1)
        self.assertEqual(response.data["results"][0]["name"], self.goal.name)

    def test_filter_by_name_icontains(self):
        url = reverse("api:goals:treatment_goals-list")
        response = self.client.get(url, {"name__icontains": "2"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data.get("results")), 1)
        self.assertEqual(response.data.get("count"), 1)
        self.assertEqual(response.data["results"][0]["name"], self.goal2.name)
