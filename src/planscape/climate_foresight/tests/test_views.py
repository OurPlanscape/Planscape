import json
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from climate_foresight.models import ClimateForesightRun
from climate_foresight.tests.factories import ClimateForesightRunFactory
from planning.tests.factories import PlanningAreaFactory
from planscape.tests.factories import UserFactory


class ClimateForesightRunViewSetTest(APITestCase):
    def setUp(self):
        self.user = UserFactory(
            username="testuser", first_name="Test", last_name="User"
        )
        self.other_user = UserFactory(
            username="otheruser", first_name="Other", last_name="Person"
        )

        self.planning_area = PlanningAreaFactory(user=self.user)
        self.other_planning_area = PlanningAreaFactory(user=self.other_user)
        self.shared_planning_area = PlanningAreaFactory(user=self.user)

        self.user_run1 = ClimateForesightRunFactory(
            planning_area=self.planning_area,
            user=self.user,
            name="User Run 1",
            status="draft",
        )
        self.user_run2 = ClimateForesightRunFactory(
            planning_area=self.planning_area,
            user=self.user,
            name="User Run 2",
            status="running",
        )
        self.user_run3 = ClimateForesightRunFactory(
            planning_area=self.shared_planning_area,
            user=self.user,
            name="User Run 3",
            status="done",
        )
        self.other_run = ClimateForesightRunFactory(
            planning_area=self.other_planning_area,
            user=self.other_user,
            name="Other User Run",
            status="draft",
        )

        self.base_url = "/api/v2/climate-foresight-runs/"

    def test_unauthenticated_access(self):
        response = self.client.get(self.base_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_user_runs(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.base_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(len(data), 3)
        run_names = [r["name"] for r in data]
        self.assertIn("User Run 1", run_names)
        self.assertIn("User Run 2", run_names)
        self.assertIn("User Run 3", run_names)
        self.assertNotIn("Other User Run", run_names)

    def test_list_with_planning_area_filter(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(
            self.base_url, {"planning_area": self.planning_area.id}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(len(data), 2)
        run_names = [r["name"] for r in data]
        self.assertIn("User Run 1", run_names)
        self.assertIn("User Run 2", run_names)
        self.assertNotIn("User Run 3", run_names)

    def test_retrieve_run(self):
        self.client.force_authenticate(user=self.user)
        url = f"{self.base_url}{self.user_run1.id}/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(data["id"], self.user_run1.id)
        self.assertEqual(data["name"], "User Run 1")
        self.assertEqual(data["status"], "draft")
        self.assertEqual(data["planning_area"], self.planning_area.id)
        self.assertEqual(data["planning_area_name"], self.planning_area.name)
        self.assertEqual(data["creator"], "Test User")

    def test_cannot_retrieve_other_user_run(self):
        self.client.force_authenticate(user=self.user)
        url = f"{self.base_url}{self.other_run.id}/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_run(self):
        self.client.force_authenticate(user=self.user)

        data = {
            "name": "New Climate Run",
            "planning_area": self.planning_area.id,
            "status": "draft",
        }

        response = self.client.post(self.base_url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        response_data = response.json()

        self.assertIn("id", response_data)
        self.assertEqual(response_data["name"], "New Climate Run")
        self.assertEqual(response_data["planning_area"], self.planning_area.id)
        self.assertEqual(response_data["status"], "draft")

        created_run = ClimateForesightRun.objects.get(id=response_data["id"])
        self.assertEqual(created_run.user, self.user)

    def test_create_run_invalid_planning_area(self):
        self.client.force_authenticate(user=self.user)

        data = {
            "name": "Invalid Run",
            "planning_area": self.other_planning_area.id,
            "status": "draft",
        }

        response = self.client.post(self.base_url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("planning_area", response.json())

    def test_update_run(self):
        self.client.force_authenticate(user=self.user)
        url = f"{self.base_url}{self.user_run1.id}/"

        data = {
            "name": "Updated Run Name",
            "planning_area": self.planning_area.id,
            "status": "running",
        }

        response = self.client.put(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        updated_run = ClimateForesightRun.objects.get(id=self.user_run1.id)
        self.assertEqual(updated_run.name, "Updated Run Name")
        self.assertEqual(updated_run.status, "running")

    def test_partial_update_run(self):
        self.client.force_authenticate(user=self.user)
        url = f"{self.base_url}{self.user_run1.id}/"

        data = {"status": "done"}

        response = self.client.patch(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        updated_run = ClimateForesightRun.objects.get(id=self.user_run1.id)
        self.assertEqual(updated_run.status, "done")
        self.assertEqual(updated_run.name, "User Run 1")

    def test_cannot_update_other_user_run(self):
        self.client.force_authenticate(user=self.user)
        url = f"{self.base_url}{self.other_run.id}/"

        data = {"name": "Hacked Name"}

        response = self.client.patch(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_run(self):
        self.client.force_authenticate(user=self.user)
        run_id = self.user_run1.id
        url = f"{self.base_url}{run_id}/"

        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(ClimateForesightRun.objects.filter(id=run_id).exists())

    def test_cannot_delete_other_user_run(self):
        self.client.force_authenticate(user=self.user)
        url = f"{self.base_url}{self.other_run.id}/"

        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(
            ClimateForesightRun.objects.filter(id=self.other_run.id).exists()
        )

    def test_by_planning_area_action(self):
        self.client.force_authenticate(user=self.user)
        url = f"{self.base_url}by-planning-area/{self.planning_area.id}/"

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(len(data), 2)
        run_names = [r["name"] for r in data]
        self.assertIn("User Run 1", run_names)
        self.assertIn("User Run 2", run_names)

    def test_by_planning_area_no_access(self):
        self.client.force_authenticate(user=self.user)
        url = f"{self.base_url}by-planning-area/{self.other_planning_area.id}/"

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_by_planning_area_invalid_id(self):
        self.client.force_authenticate(user=self.user)
        url = f"{self.base_url}by-planning-area/99999/"

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_list_serializer_for_list_action(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.base_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        for item in data:
            self.assertIn("id", item)
            self.assertIn("name", item)
            self.assertIn("planning_area", item)
            self.assertIn("planning_area_name", item)
            self.assertIn("creator", item)
            self.assertIn("status", item)
            self.assertIn("created_at", item)

    def test_detail_serializer_for_retrieve_action(self):
        self.client.force_authenticate(user=self.user)
        url = f"{self.base_url}{self.user_run1.id}/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        expected_fields = [
            "id",
            "name",
            "planning_area",
            "planning_area_name",
            "user",
            "creator",
            "status",
            "created_at",
        ]

        for field in expected_fields:
            self.assertIn(field, data)

    def test_ordering_by_created_at(self):
        self.client.force_authenticate(user=self.user)

        newest_run = ClimateForesightRunFactory(
            planning_area=self.planning_area, user=self.user, name="Newest Run"
        )

        response = self.client.get(self.base_url)
        data = response.json()

        self.assertEqual(data[0]["name"], "Newest Run")
        self.assertEqual(data[-1]["name"], "User Run 1")
