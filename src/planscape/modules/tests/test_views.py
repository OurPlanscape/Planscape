from unittest import mock

from datasets.models import DataLayerType, PreferredDisplayType, VisibilityOptions
from datasets.tests.factories import DatasetFactory, DataLayerFactory, StyleFactory
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from planning.models import TreatmentGoalUsageType
from rest_framework import status
from rest_framework.test import APIClient


class ModuleAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def _get_module_with_query_count(self, module_name):
        url = reverse("api:modules:modules-detail", kwargs={"pk": module_name})
        with CaptureQueriesContext(connection) as context:
            response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response, len(context)

    def _create_styled_datalayer(self, **kwargs):
        datalayer = DataLayerFactory.create(**kwargs)
        style = StyleFactory.create(organization=datalayer.organization)
        datalayer.styles.add(style)
        return datalayer

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

        url = reverse("api:modules:modules-details", kwargs={"pk": pk})
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
        dataset = DatasetFactory.create(
            visibility=VisibilityOptions.PUBLIC,
            preferred_display_type=PreferredDisplayType.MAIN_DATALAYERS,
        )
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
        self.assertEqual(
            [
                item["id"]
                for item in response.data["options"]["datasets"]["main_datasets"]
            ],
            [dataset.id],
        )

    def test_advanced_stand_level_constraint_details_filters_by_geometry(self):
        dataset = DatasetFactory.create(visibility=VisibilityOptions.PUBLIC)
        metadata = {"modules": {"advanced_stand_level_constraint": {"enabled": True}}}
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

    def test_retrieve_forsys_prefetches_styled_datalayer_options(self):
        dataset = DatasetFactory.create(
            visibility=VisibilityOptions.PUBLIC,
            preferred_display_type=PreferredDisplayType.MAIN_DATALAYERS,
            modules=["forsys"],
        )
        inclusion_metadata = {
            "modules": {
                "forsys": {
                    "capabilities": [TreatmentGoalUsageType.INCLUSION_ZONE],
                }
            }
        }
        exclusion_metadata = {
            "modules": {
                "forsys": {
                    "capabilities": [TreatmentGoalUsageType.EXCLUSION_ZONE],
                }
            }
        }
        self._create_styled_datalayer(
            dataset=dataset,
            type=DataLayerType.RASTER,
            metadata=inclusion_metadata,
        )
        self._create_styled_datalayer(
            dataset=dataset,
            type=DataLayerType.RASTER,
            metadata=exclusion_metadata,
        )
        _, base_query_count = self._get_module_with_query_count("forsys")

        for _ in range(2):
            self._create_styled_datalayer(
                dataset=dataset,
                type=DataLayerType.RASTER,
                metadata=inclusion_metadata,
            )
            self._create_styled_datalayer(
                dataset=dataset,
                type=DataLayerType.RASTER,
                metadata=exclusion_metadata,
            )

        response, expanded_query_count = self._get_module_with_query_count("forsys")

        self.assertEqual(expanded_query_count, base_query_count)
        self.assertEqual(len(response.data["options"]["inclusions"]), 3)
        self.assertEqual(len(response.data["options"]["exclusions"]), 3)

    def test_retrieve_prioritize_sub_units_prefetches_styled_datalayer_options(self):
        dataset = DatasetFactory.create(
            visibility=VisibilityOptions.PUBLIC,
            preferred_display_type=PreferredDisplayType.MAIN_DATALAYERS,
            modules=["prioritize_sub_units"],
        )
        metadata = {
            "modules": {"prioritize_sub_units": {"enabled": True}},
        }
        self._create_styled_datalayer(
            dataset=dataset,
            type=DataLayerType.VECTOR,
            metadata=metadata,
        )
        _, base_query_count = self._get_module_with_query_count("prioritize_sub_units")

        for _ in range(2):
            self._create_styled_datalayer(
                dataset=dataset,
                type=DataLayerType.VECTOR,
                metadata=metadata,
            )

        response, expanded_query_count = self._get_module_with_query_count(
            "prioritize_sub_units"
        )

        self.assertEqual(expanded_query_count, base_query_count)
        self.assertEqual(len(response.data["options"]["sub_units"]), 3)

    def test_retrieve_advanced_stand_level_prefetches_styled_datalayer_options(self):
        dataset = DatasetFactory.create(
            visibility=VisibilityOptions.PUBLIC,
            preferred_display_type=PreferredDisplayType.MAIN_DATALAYERS,
        )
        metadata = {
            "modules": {"advanced_stand_level_constraint": {"enabled": True}},
        }
        self._create_styled_datalayer(
            dataset=dataset,
            type=DataLayerType.RASTER,
            metadata=metadata,
        )
        _, base_query_count = self._get_module_with_query_count(
            "advanced_stand_level_constraint"
        )

        for _ in range(2):
            self._create_styled_datalayer(
                dataset=dataset,
                type=DataLayerType.RASTER,
                metadata=metadata,
            )

        response, expanded_query_count = self._get_module_with_query_count(
            "advanced_stand_level_constraint"
        )

        self.assertEqual(expanded_query_count, base_query_count)
        self.assertEqual(len(response.data["options"]["datalayers"]), 3)
