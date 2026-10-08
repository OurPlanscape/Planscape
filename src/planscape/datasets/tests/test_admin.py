from django.contrib import admin
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import RequestFactory, SimpleTestCase, TestCase
from django.urls import reverse

from datasets.admin import DataLayerAdmin
from datasets.forms import DataLayerAdminForm
from datasets.models import DataLayer, Dataset, SimpleCategory
from datasets.tests.factories import DataLayerFactory, SimpleCategoryFactory
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


class SimpleCategoryAdminDataLayersTest(TestCase):
    def setUp(self):
        self.user = UserFactory.create(is_staff=True, is_superuser=True)
        self.client.force_login(self.user)
        self.datalayer_a = DataLayerFactory.create(name="Canopy Cover")
        self.datalayer_b = DataLayerFactory.create(name="Fire Severity")

    def test_change_form_prefills_existing_datalayers(self):
        category = SimpleCategoryFactory.create()
        self.datalayer_a.simple_categories.add(category)

        url = reverse("admin:datasets_simplecategory_change", args=[category.pk])
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            list(response.context["adminform"].form["datalayers"].value()),
            [self.datalayer_a.pk],
        )

    def test_add_view_links_multiple_datalayers(self):
        url = reverse("admin:datasets_simplecategory_add")
        response = self.client.post(
            url,
            {
                "name": "Fire",
                "icon": "",
                "datalayers": [self.datalayer_a.pk, self.datalayer_b.pk],
            },
        )

        self.assertEqual(response.status_code, 302)
        category = SimpleCategory.objects.get(name="Fire")
        self.assertQuerySetEqual(
            category.datalayers.order_by("pk"),
            [self.datalayer_a, self.datalayer_b],
        )

    def test_change_view_removes_unselected_datalayers(self):
        category = SimpleCategoryFactory.create()
        category.datalayers.add(self.datalayer_a, self.datalayer_b)

        url = reverse("admin:datasets_simplecategory_change", args=[category.pk])
        response = self.client.post(
            url,
            {
                "name": category.name,
                "icon": "",
                "datalayers": [self.datalayer_b.pk],
            },
        )

        self.assertEqual(response.status_code, 302)
        self.assertQuerySetEqual(category.datalayers.all(), [self.datalayer_b])

    def test_datalayers_autocomplete_searches_datalayers(self):
        url = reverse("admin:autocomplete")
        response = self.client.get(
            url,
            {
                "app_label": "datasets",
                "model_name": "datalayer_simple_categories",
                "field_name": "datalayer",
                "term": "Canopy",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [result["id"] for result in response.json()["results"]],
            [str(self.datalayer_a.pk)],
        )
