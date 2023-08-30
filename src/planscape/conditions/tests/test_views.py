from django.test import TestCase


class ConditionTest(TestCase):
    def setUp(self):
        self._api_prefix = "/planscape-backend/conditions"

    def test_bad_colormap(self):
        response = self.client.get(self._api_prefix + "/colormap/?colormap=foo")
        self.assertEqual(response.status_code, 400)

    def test_good_colormap(self):
        response = self.client.get(self._api_prefix + "/colormap/?colormap=viridis")
        self.assertEqual(response.status_code, 200)
