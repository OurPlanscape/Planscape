
from unittest import mock

from datasets.models import DataLayerType, VisibilityOptions
from datasets.tests.factories import DatasetFactory, DataLayerFactory
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient


class ModuleAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

    @mock.patch("modules.base.get_module")
    def test_retrieve_success_200(self, get_module_mock):
        pk = "forsys"
        payload = {"name": "forsys", "version": "1.0.0"}
        get_module_mock.return_value = payload

        url = reverse("api:modules:modules-detail", kwargs={"pk": pk})
        resp = self.client.get(url)

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsInstance(resp.data, dict)
        self.assertEqual(resp.data.get("name"), "forsys")

    @mock.patch("modules.base.get_module", side_effect=KeyError)
    def test_retrieve_404_when_service_raises_keyerror(self, _get_module_mock):
        pk = "does-not-exist"
        url = reverse("api:modules:modules-detail", kwargs={"pk": pk})
        resp = self.client.get(url)

        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("detail", resp.data)
        self.assertIn(pk, str(resp.data["detail"]))

    @mock.patch("modules.base.get_module")
    def test_post_details_success_200(self, get_module_mock):
        pk = "forsys"
        payload = {"name": "forsys", "version": "1.0.0"}
        get_module_mock.return_value = payload

        url = reverse('api:modules:modules-details', kwargs={'pk': pk})
        resp = self.client.post(url, data={})

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsInstance(resp.data, dict)
        self.assertEqual(resp.data.get("name"), "forsys")

    @mock.patch("modules.base.get_module")
    def test_post_details_success_200_with_geometry(self, get_module_mock):
        pk = "forsys"
        payload = {"name": "forsys", "version": "1.0.0"}
        get_module_mock.return_value = payload
        geometry = """{
            "type": "MultiPolygon",
            "coordinates": [[[[1, 2], [2, 3], [3, 4], [1, 2]]]],
        }"""
        request_payload = {"geometry": geometry}

        url = f"{reverse('api:modules:modules-details', kwargs={'pk': pk})}"
        resp = self.client.post(url, data=request_payload)

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsInstance(resp.data, dict)
        self.assertEqual(resp.data.get("name"), "forsys")

    @mock.patch("modules.base.get_module", side_effect=KeyError)
    def test_post_details_404_when_service_raises_keyerror(self, _get_module_mock):
        pk = "does-not-exist"
        url = reverse("api:modules:modules-details", kwargs={"pk": pk})
        resp = self.client.post(url, data={})

        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("detail", resp.data)
        self.assertIn(pk, str(resp.data["detail"]))

    def test_retrieve_advanced_stand_level_constraint_datalayers(self):
        dataset = DatasetFactory.create(visibility=VisibilityOptions.PUBLIC)
        datalayer = DataLayerFactory.create(
            dataset=dataset,
            type=DataLayerType.RASTER,
            metadata={
                "modules": {"advanced_stand_level_constraint": {"enabled": True}}
            },
        )
        url = reverse(
            "api:modules:modules-detail",
            kwargs={"pk": "advanced_stand_level_constraint"},
        )

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data["options"]["datalayers"], list)
        self.assertEqual(
            [item["id"] for item in response.data["options"]["datalayers"]],
            [datalayer.id],
        )

    def test_advanced_stand_level_constraint_details_filters_by_geometry(self):
        dataset = DatasetFactory.create(visibility=VisibilityOptions.PUBLIC)
        metadata = {
            "modules": {"advanced_stand_level_constraint": {"enabled": True}}
        }
        included = DataLayerFactory.create(
            dataset=dataset,
            type=DataLayerType.RASTER,
            outline="MULTIPOLYGON(((0 0, 2 0, 2 2, 0 2, 0 0)))",
            metadata=metadata,
        )
        excluded = DataLayerFactory.create(
            dataset=dataset,
            type=DataLayerType.RASTER,
            outline="MULTIPOLYGON(((3 3, 4 3, 4 4, 3 4, 3 3)))",
            metadata=metadata,
        )
        url = reverse(
            "api:modules:modules-details",
            kwargs={"pk": "advanced_stand_level_constraint"},
        )
        geometry = {
            "type": "MultiPolygon",
            "coordinates": [[[[1, 1], [2, 1], [2, 2], [1, 2], [1, 1]]]],
        }

        response = self.client.post(url, data={"geometry": geometry}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            {item["id"] for item in response.data["options"]["datalayers"]},
            {included.id},
        )
        self.assertNotIn(
            excluded.id,
            {item["id"] for item in response.data["options"]["datalayers"]},
        )
