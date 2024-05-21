from django.test import TestCase, Client
from django.urls import reverse


class ConfigViewTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_region_found(self):
        response = self.client.get(
            reverse("conditions:legacy_conditions"),
            {"region_name": "northern-california"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["region_name"], "northern-california")

    def test_flat_region(self):
        response = self.client.get(
            reverse("conditions:legacy_conditions"),
            {"region_name": "northern-california", "flat": "true"},
        )
        data = response.json()
        regions = set(
            map(lambda item: item.get("region_name"), data),
        )
        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(data)
        self.assertIsInstance(data, list)
        self.assertEqual(regions, {"northern-california"})
