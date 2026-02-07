from planning.tests.factories import PlanningAreaFactory
from rest_framework import status
from rest_framework.test import APITestCase

from climate_foresight.models import ClimateForesightRun
from climate_foresight.tests.factories import (
    ClimateForesightRunFactory,
    ClimateForesightPillarFactory,
    GlobalClimateForesightPillarFactory,
)
from planscape.tests.factories import UserFactory


class ClimateForesightRunViewSetTest(APITestCase):
    def setUp(self):
        from django.contrib.contenttypes.models import ContentType

        ContentType.objects.get_or_create(app_label="planning", model="planningarea")

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
            created_by=self.user,
            name="User Run 1",
            status="draft",
        )
        self.user_run2 = ClimateForesightRunFactory(
            planning_area=self.planning_area,
            created_by=self.user,
            name="User Run 2",
            status="running",
        )
        self.user_run3 = ClimateForesightRunFactory(
            planning_area=self.shared_planning_area,
            created_by=self.user,
            name="User Run 3",
            status="done",
        )
        self.other_run = ClimateForesightRunFactory(
            planning_area=self.other_planning_area,
            created_by=self.other_user,
            name="Other User Run",
            status="draft",
        )

        self.base_url = "/planscape-backend/v2/climate-foresight-runs/"

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
            "input_datalayers": [],
        }

        response = self.client.post(self.base_url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        response_data = response.json()

        self.assertIn("id", response_data)
        self.assertEqual(response_data["name"], "New Climate Run")
        self.assertEqual(response_data["planning_area"], self.planning_area.id)
        self.assertEqual(response_data["status"], "draft")

        created_run = ClimateForesightRun.objects.get(id=response_data["id"])
        self.assertEqual(created_run.created_by, self.user)

    def test_create_run_invalid_planning_area(self):
        self.client.force_authenticate(user=self.user)

        data = {
            "name": "Invalid Run",
            "planning_area": self.other_planning_area.id,
            "status": "draft",
        }

        response = self.client.post(self.base_url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        expected_error = {
            "detail": "Validation error.",
            "errors": {
                "planning_area": ["You don't have access to this planning area."]
            },
        }
        self.assertEqual(response.json(), expected_error)

    def test_update_run(self):
        self.client.force_authenticate(user=self.user)
        url = f"{self.base_url}{self.user_run1.id}/"

        data = {
            "name": "Updated Run Name",
            "planning_area": self.planning_area.id,
            "status": "running",
            "input_datalayers": [],
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

        self.planning_area.refresh_from_db()

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
            "creator",
            "status",
            "created_at",
        ]

        for field in expected_fields:
            self.assertIn(field, data)

    def test_ordering_by_created_at(self):
        self.client.force_authenticate(user=self.user)

        ClimateForesightRunFactory(
            planning_area=self.planning_area, created_by=self.user, name="Newest Run"
        )

        response = self.client.get(self.base_url)
        data = response.json()

        self.assertEqual(data[0]["name"], "Newest Run")
        self.assertEqual(data[-1]["name"], "User Run 1")


class ClimateForesightPillarViewSetTest(APITestCase):
    def setUp(self):
        from django.contrib.contenttypes.models import ContentType

        ContentType.objects.get_or_create(app_label="planning", model="planningarea")

        self.user = UserFactory(
            username="testuser", first_name="Test", last_name="User"
        )
        self.other_user = UserFactory(
            username="otheruser", first_name="Other", last_name="Person"
        )

        self.planning_area = PlanningAreaFactory(user=self.user)

        self.user_run1 = ClimateForesightRunFactory(
            planning_area=self.planning_area,
            created_by=self.user,
            name="User Run 1",
            status="draft",
        )
        self.user_run2 = ClimateForesightRunFactory(
            planning_area=self.planning_area,
            created_by=self.user,
            name="User Run 2",
            status="draft",
        )

        # create global pillars
        self.global_pillar1 = GlobalClimateForesightPillarFactory(
            name="Global Pillar 1", order=1, created_by=self.user
        )
        self.global_pillar2 = GlobalClimateForesightPillarFactory(
            name="Global Pillar 2", order=2, created_by=self.user
        )

        # create custom pillars for run1
        self.custom_pillar1_run1 = ClimateForesightPillarFactory(
            run=self.user_run1,
            name="Custom Pillar 1",
            order=1,
            created_by=self.user,
        )
        self.custom_pillar2_run1 = ClimateForesightPillarFactory(
            run=self.user_run1,
            name="Custom Pillar 2",
            order=2,
            created_by=self.user,
        )

        # create custom pillar for run2
        self.custom_pillar1_run2 = ClimateForesightPillarFactory(
            run=self.user_run2,
            name="Custom Pillar 1",
            order=1,
            created_by=self.user,
        )

        self.base_url = "/planscape-backend/v2/climate-foresight-pillars/"

    def test_unauthenticated_access(self):
        response = self.client.get(self.base_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_all_pillars_without_filter(self):
        """Test listing pillars without run filter returns only global pillars."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.base_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertGreaterEqual(len(data), 10)

        pillar_names = [p["name"] for p in data]

        self.assertIn("Air Quality", pillar_names)
        self.assertIn("Fire Dynamics", pillar_names)
        self.assertIn("Water Security", pillar_names)

        # Check test global pillars are included
        self.assertIn("Global Pillar 1", pillar_names)
        self.assertIn("Global Pillar 2", pillar_names)

    def test_list_pillars_filtered_by_run(self):
        """Test filtering pillars by run parameter returns global + custom for that run."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.base_url, {"run": self.user_run1.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertGreaterEqual(len(data), 12)

        pillar_names = [p["name"] for p in data]
        self.assertIn("Custom Pillar 1", pillar_names)
        self.assertIn("Custom Pillar 2", pillar_names)
        self.assertIn("Air Quality", pillar_names)
        self.assertIn("Fire Dynamics", pillar_names)

        custom_pillars = [p for p in data if p["is_custom"]]
        custom_pillar_names = [p["name"] for p in custom_pillars]
        self.assertIn("Custom Pillar 1", custom_pillar_names)
        self.assertIn("Custom Pillar 2", custom_pillar_names)

    def test_pillar_ordering_with_run_filter(self):
        """Test that custom pillars come before global pillars when filtering by run."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.base_url, {"run": self.user_run1.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        pillar_names = [p["name"] for p in data]
        pillar_is_custom = [p["is_custom"] for p in data]

        # first two should be custom pillars
        self.assertEqual(pillar_names[0], "Custom Pillar 1")
        self.assertEqual(pillar_names[1], "Custom Pillar 2")
        self.assertTrue(pillar_is_custom[0])
        self.assertTrue(pillar_is_custom[1])

        # last two should be global pillars
        for i in range(2, len(pillar_is_custom)):
            self.assertFalse(
                pillar_is_custom[i],
                f"Pillar at index {i} ({pillar_names[i]}) should be global",
            )

    def test_user_cannot_see_other_users_custom_pillars(self):
        """Test that users only see global pillars without run filter (no custom pillars from any user)."""
        other_user_run = ClimateForesightRunFactory(
            planning_area=PlanningAreaFactory(user=self.other_user),
            created_by=self.other_user,
            name="Other User Run",
        )
        ClimateForesightPillarFactory(
            run=other_user_run,
            name="Other Custom Pillar",
            created_by=self.other_user,
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.base_url)

        data = response.json()
        pillar_names = [p["name"] for p in data]

        self.assertNotIn("Other Custom Pillar", pillar_names)

    def test_cannot_filter_by_other_users_run(self):
        """Test that filtering by another user's run returns validation error."""
        other_user_run = ClimateForesightRunFactory(
            planning_area=PlanningAreaFactory(user=self.other_user),
            created_by=self.other_user,
            name="Other User Run",
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.base_url, {"run": other_user_run.id})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
