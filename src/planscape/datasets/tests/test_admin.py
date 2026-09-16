from django.contrib import admin
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import RequestFactory, SimpleTestCase, TestCase

from datasets.admin import DataLayerAdmin
from datasets.forms import DataLayerAdminForm
from datasets.models import DataLayer, Dataset
from datasets.tests.factories import DataLayerFactory
from datasets.tests.test_shapefile_geometry import make_shapefile_zip
from planscape.tests.factories import UserFactory


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


class DataLayerAdminShapefileUploadTest(TestCase):
    def setUp(self):
        self.datalayer = DataLayerFactory.create(
            url="s3://bucket/original.zip",
            table="datastore.original",
            info={"original": True},
        )

    def _form_data(self):
        return {
            "organization": self.datalayer.organization.pk,
            "dataset": self.datalayer.dataset.pk,
            "name": self.datalayer.name,
            "table": self.datalayer.table,
            "metadata": "{}",
        }

    def test_admin_form_exposes_shapefile_zip_upload(self):
        form = DataLayerAdminForm(instance=self.datalayer)

        self.assertIn("geometry_shapefile_zip", form.fields)

    def test_admin_form_rejects_non_zip_upload(self):
        uploaded_file = SimpleUploadedFile(
            "shape.txt",
            make_shapefile_zip(),
            content_type="text/plain",
        )

        form = DataLayerAdminForm(
            data=self._form_data(),
            files={"geometry_shapefile_zip": uploaded_file},
            instance=self.datalayer,
        )

        self.assertFalse(form.is_valid())
        self.assertIn("geometry_shapefile_zip", form.errors)

    def test_admin_save_updates_only_geometry_fields_from_upload(self):
        original_type = self.datalayer.type
        original_status = self.datalayer.status
        uploaded_file = SimpleUploadedFile(
            "shape.zip",
            make_shapefile_zip(),
            content_type="application/zip",
        )
        form = DataLayerAdminForm(
            data=self._form_data(),
            files={"geometry_shapefile_zip": uploaded_file},
            instance=self.datalayer,
        )
        self.assertTrue(form.is_valid(), form.errors)
        obj = form.save(commit=False)

        request = RequestFactory().post("/")
        request.user = UserFactory.create(is_staff=True, is_superuser=True)
        model_admin = DataLayerAdmin(DataLayer, admin.site)
        model_admin.save_model(request, obj, form, change=True)

        self.datalayer.refresh_from_db()
        self.assertEqual(self.datalayer.geometry.geom_type, "Polygon")
        self.assertEqual(self.datalayer.outline.geom_type, "MultiPolygon")
        self.assertEqual(self.datalayer.url, "s3://bucket/original.zip")
        self.assertEqual(self.datalayer.table, "datastore.original")
        self.assertEqual(self.datalayer.info, {"original": True})
        self.assertEqual(self.datalayer.type, original_type)
        self.assertEqual(self.datalayer.status, original_status)
