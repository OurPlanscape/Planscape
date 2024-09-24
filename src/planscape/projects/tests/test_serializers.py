# from django.test import TransactionTestCase
# from projects.models import (
#     Project,
#     Organization,
#     ProjectVisibility,
#     ProjectCapabilities,
# )
# from projects.serializers import ProjectSerializer
# from django.contrib.gis.geos import MultiPolygon, Polygon
# from django.contrib.auth import get_user_model

# User = get_user_model()


# class ProjectSerializerTest(TransactionTestCase):
#     def setUp(self):
#         self.organization = Organization.objects.create(name="Test Organization")
#         self.user = User.objects.create(username="testuser")
#         self.project_data = {
#             "organization": self.organization.id,
#             "created_by": self.user.id,
#             "name": "Test Project",
#             "display_name": "Test Project Display",
#             "visibility": ProjectVisibility.PUBLIC,
#             "capabilities": [ProjectCapabilities.EXPLORE, ProjectCapabilities.PLAN],
#             "geometry": MultiPolygon(Polygon(((0, 0), (1, 0), (1, 1), (0, 1), (0, 0)))),
#         }

#     def test_project_serializer_valid(self):
#         serializer = ProjectSerializer(data=self.project_data)
#         self.assertTrue(serializer.is_valid())
#         project = serializer.save()
#         self.assertEqual(project.name, self.project_data["name"])
#         self.assertEqual(project.display_name, self.project_data["display_name"])
#         self.assertEqual(project.visibility, self.project_data["visibility"])

#     def test_project_serializer_missing_name(self):
#         del self.project_data["name"]
#         serializer = ProjectSerializer(data=self.project_data)
#         self.assertFalse(serializer.is_valid())
#         self.assertIn("name", serializer.errors)

#     def test_project_serializer_invalid_visibility(self):
#         self.project_data["visibility"] = "INVALID"
#         serializer = ProjectSerializer(data=self.project_data)
#         self.assertFalse(serializer.is_valid())
#         self.assertIn("visibility", serializer.errors)

#     def test_project_serializer_invalid_capabilities(self):
#         self.project_data["capabilities"] = ["INVALID"]
#         serializer = ProjectSerializer(data=self.project_data)
#         self.assertFalse(serializer.is_valid())
#         self.assertIn("capabilities", serializer.errors)

#     def test_project_serializer_missing_geometry(self):
#         del self.project_data["geometry"]
#         serializer = ProjectSerializer(data=self.project_data)
#         self.assertFalse(serializer.is_valid())
#         self.assertIn("geometry", serializer.errors)

#     def test_project_serializer_missing_organization(self):
#         del self.project_data["organization"]
#         serializer = ProjectSerializer(data=self.project_data)
#         self.assertFalse(serializer.is_valid())
#         self.assertIn("organization", serializer.errors)

#     def test_project_serializer_missing_created_by(self):
#         del self.project_data["created_by"]
#         serializer = ProjectSerializer(data=self.project_data)
#         self.assertTrue(serializer.is_valid())
#         project = serializer.save()
#         self.assertIsNone(project.created_by)

#     def test_project_serializer_empty_capabilities(self):
#         self.project_data["capabilities"] = []
#         serializer = ProjectSerializer(data=self.project_data)
#         self.assertFalse(serializer.is_valid())

#     def test_project_serializer_invalid_geometry(self):
#         self.project_data["geometry"] = "INVALID"
#         serializer = ProjectSerializer(data=self.project_data)
#         self.assertFalse(serializer.is_valid())
#         self.assertIn("geometry", serializer.errors)

#     def test_project_serializer_null_display_name(self):
#         self.project_data["display_name"] = None
#         serializer = ProjectSerializer(data=self.project_data)
#         self.assertTrue(serializer.is_valid())
#         project = serializer.save()
#         self.assertIsNone(project.display_name)

#     def test_project_serializer_partial_update(self):
#         project = Project.objects.create(
#             organization=self.organization,
#             created_by=self.user,
#             name="Initial Project",
#             display_name="Initial Display",
#             visibility=ProjectVisibility.PUBLIC,
#             capabilities=[ProjectCapabilities.EXPLORE],
#             geometry=MultiPolygon(Polygon(((0, 0), (1, 0), (1, 1), (0, 1), (0, 0)))),
#         )
#         update_data = {"name": "Updated Project"}
#         serializer = ProjectSerializer(project, data=update_data, partial=True)
#         self.assertTrue(serializer.is_valid())
#         updated_project = serializer.save()
#         self.assertEqual(updated_project.name, "Updated Project")
#         self.assertEqual(updated_project.display_name, "Initial Display")
