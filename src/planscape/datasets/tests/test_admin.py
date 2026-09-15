from django.contrib import admin
from django.test import SimpleTestCase

from datasets.models import DataLayer, Dataset


class DatasetAdminTest(SimpleTestCase):
    def test_timestamps_are_visible_and_readonly(self):
        model_admin = admin.site._registry[Dataset]

        self.assertIn("created_at", model_admin.list_display)
        self.assertIn("updated_at", model_admin.list_display)
        self.assertIn("created_at", model_admin.readonly_fields)
        self.assertIn("updated_at", model_admin.readonly_fields)


class DataLayerAdminTest(SimpleTestCase):
    def test_timestamps_are_visible_and_readonly(self):
        model_admin = admin.site._registry[DataLayer]

        self.assertIn("created_at", model_admin.list_display)
        self.assertIn("updated_at", model_admin.list_display)
        self.assertIn("created_at", model_admin.readonly_fields)
        self.assertIn("updated_at", model_admin.readonly_fields)
