# from rest_framework.test import APITestCase
# from django.contrib.gis.geos import MultiPolygon, Polygon
# from metrics.models import Metric, Category
# from projects.models import Project
# from datasets.models import Dataset
# from organizations.models import Organization
# from metrics.serializers import MetricSerializer
# from django.contrib.auth import get_user_model

# User = get_user_model()


# class MetricSerializerTest(APITestCase):
#     def setUp(self):
#         self.organization = Organization.objects.create(name="Test Org")
#         self.project = Project.objects.create(
#             name="Test Project",
#             organization=self.organization,
#             geometry=MultiPolygon(Polygon(((0, 0), (1, 0), (1, 1), (0, 1), (0, 0)))),
#         )
#         self.user = User.objects.create_user(username="testuser", password="12345")
#         self.category = Category.add_root(
#             name="Test Category",
#             organization=self.organization,
#             project=self.project,
#             created_by=self.user,
#         )
#         self.dataset = Dataset.objects.create(
#             created_by=self.user,
#             name="Test Dataset",
#             organization=self.organization,
#             type="VECTOR",
#             blob_status="READY",
#             url="http://example.com/dataset",
#         )
#         self.metric_data = {
#             "uuid": "123e4567-e89b-12d3-a456-426614174000",
#             "project": self.project,
#             "dataset": self.dataset,
#             "category": self.category,
#             "name": "Test Metric",
#             "display_name": "Test Metric Display",
#             "created_by": self.user,
#         }
#         self.metric = Metric.objects.create(**self.metric_data)

#     def test_metric_serializer(self):
#         serializer = MetricSerializer(instance=self.metric)
#         data = serializer.data
#         self.assertEqual(data["id"], self.metric.id)
#         self.assertEqual(data["organization"], self.metric.project.organization.id)
#         self.assertEqual(data["project"], self.metric.project.id)
#         self.assertEqual(data["dataset"]["id"], self.metric.dataset.id)
#         self.assertEqual(data["name"], self.metric.name)
#         self.assertEqual(data["display_name"], self.metric.display_name)
#         self.assertEqual(data["capabilities"], self.metric.capabilities)
