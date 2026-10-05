from django.contrib import admin
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import RequestFactory, TestCase

from datasets.tests.test_shapefile_geometry import make_shapefile_zip
from planning.admin import TreatmentGoalAdmin
from planning.forms import TreatmentGoalAdminForm
from planning.models import TreatmentGoal
from planning.tests.factories import TreatmentGoalFactory
from planscape.tests.factories import UserFactory


class TreatmentGoalAdminShapefileUploadTest(TestCase):
    def setUp(self):
        self.original_geometry = MultiPolygon(
            Polygon(((2, 2), (2, 3), (3, 3), (2, 2))),
            srid=4269,
        )
        self.treatment_goal = TreatmentGoalFactory.create(
            geometry=self.original_geometry
        )

    def _form_data(self):
        return {
            "name": self.treatment_goal.name,
            "category": self.treatment_goal.category,
            "group": self.treatment_goal.group,
            "description": self.treatment_goal.description,
            "active": "on",
            "created_by": self.treatment_goal.created_by.pk,
        }

    def test_admin_form_exposes_shapefile_zip_upload(self):
        form = TreatmentGoalAdminForm(instance=self.treatment_goal)

        self.assertIn("geometry_shapefile_zip", form.fields)

    def test_admin_form_rejects_non_zip_upload(self):
        uploaded_file = SimpleUploadedFile(
            "shape.txt",
            make_shapefile_zip(),
            content_type="text/plain",
        )

        form = TreatmentGoalAdminForm(
            data=self._form_data(),
            files={"geometry_shapefile_zip": uploaded_file},
            instance=self.treatment_goal,
        )

        self.assertFalse(form.is_valid())
        self.assertIn("geometry_shapefile_zip", form.errors)

    def test_admin_save_updates_geometry_from_upload(self):
        uploaded_file = SimpleUploadedFile(
            "shape.zip",
            make_shapefile_zip(),
            content_type="application/zip",
        )
        form = TreatmentGoalAdminForm(
            data=self._form_data(),
            files={"geometry_shapefile_zip": uploaded_file},
            instance=self.treatment_goal,
        )
        self.assertTrue(form.is_valid(), form.errors)

        request = RequestFactory().post("/")
        request.user = UserFactory.create(is_staff=True, is_superuser=True)
        model_admin = TreatmentGoalAdmin(TreatmentGoal, admin.site)
        obj = model_admin.save_form(request, form, change=True)
        obj.save()

        self.treatment_goal.refresh_from_db()
        self.assertEqual(self.treatment_goal.geometry.geom_type, "MultiPolygon")
        self.assertNotEqual(self.treatment_goal.geometry.wkt, self.original_geometry.wkt)

    def test_admin_save_preserves_geometry_without_upload(self):
        form = TreatmentGoalAdminForm(
            data={**self._form_data(), "geometry": ""},
            instance=self.treatment_goal,
        )
        self.assertTrue(form.is_valid(), form.errors)

        request = RequestFactory().post("/")
        request.user = UserFactory.create(is_staff=True, is_superuser=True)
        model_admin = TreatmentGoalAdmin(TreatmentGoal, admin.site)
        obj = model_admin.save_form(request, form, change=True)
        obj.save()

        self.treatment_goal.refresh_from_db()
        self.assertEqual(self.treatment_goal.geometry.wkt, self.original_geometry.wkt)
