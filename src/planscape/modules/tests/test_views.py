from unittest import mock

from django.test import TestCase
from django.urls import reverse
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

        self.assertEqual(resp.status_code, 200)
        self.assertIsInstance(resp.data, dict)
        self.assertEqual(resp.data.get("name"), "forsys")

    @mock.patch("modules.base.get_module", side_effect=KeyError)
    def test_retrieve_404_when_service_raises_keyerror(self, _get_module_mock):
        pk = "does-not-exist"
        url = reverse("api:modules:modules-detail", kwargs={"pk": pk})
        resp = self.client.get(url)

        self.assertEqual(resp.status_code, 404)
        self.assertIn("detail", resp.data)
        self.assertIn(pk, str(resp.data["detail"]))
