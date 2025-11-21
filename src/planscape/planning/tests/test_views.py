import json

from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase

from planning.tests.test_geometry import read_shapefile, to_geometry


class ValidatePlanningAreaTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create(username="testuser")
        self.user.set_password("12345")
        self.user.save()
        self.valid_pa = {
            "type": "Polygon",
            "coordinates": [
                [
                    [0, 0],
                    [0, 1],
                    [1, 1],
                    [1, 0],
                    [0, 0],
                ],
            ],
        }
        self.invalid_pa = {
            "type": "Polygon",
            "coordinates": [
                [
                    [-46.01299715793388, -18.545559916237735],
                    [-45.43418235211229, -18.296994989031617],
                    [-46.02213633907763, -18.99263980743585],
                    [-45.34888332809618, -18.534006734887157],
                    [-46.01299715793388, -18.545559916237735],
                ]
            ],
        }
        with read_shapefile("planning/tests/test_data/self-intersection.shp") as col:
            self.self_intersection = json.loads(to_geometry(col[0].geometry).json)

    def test_validate_planning_area_returns_area_acres(self):
        self.client.force_authenticate(self.user)
        payload = {"geometry": self.valid_pa}
        response = self.client.post(
            reverse("planning:validate_planning_area"), data=payload, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("area_acres", response.json())

    def test_validate_planning_area_invalid_pa_fixes_pa(self):
        self.client.force_authenticate(self.user)
        payload = {"geometry": self.invalid_pa}
        response = self.client.post(
            reverse("planning:validate_planning_area"), data=payload, format="json"
        )
        self.assertEqual(response.status_code, 200)

    def test_validate_planning_area_fails(self):
        self.client.force_authenticate(self.user)
        payload = {"geometry": self.self_intersection}
        response = self.client.post(
            reverse("planning:validate_planning_area"), data=payload, format="json"
        )
        self.assertEqual(response.status_code, 400)
