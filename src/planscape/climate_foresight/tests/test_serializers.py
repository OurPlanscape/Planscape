from django.test import TestCase
from rest_framework.test import APIRequestFactory
from climate_foresight.serializers import (
    ClimateForesightRunSerializer,
    ClimateForesightRunListSerializer,
)
from climate_foresight.tests.factories import (
    ClimateForesightRunFactory,
    ClimateForesightRunInputDataLayerFactory,
)
from datasets.tests.factories import DataLayerFactory
from planning.tests.factories import PlanningAreaFactory
from planscape.tests.factories import UserFactory


class ClimateForesightRunSerializerTest(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = UserFactory(
            username="testuser", first_name="Test", last_name="User"
        )
        self.other_user = UserFactory(
            username="otheruser", first_name="Other", last_name="Person"
        )
        self.planning_area = PlanningAreaFactory(user=self.user)
        self.other_planning_area = PlanningAreaFactory(user=self.other_user)

    def test_serialize_climate_foresight_run(self):
        run = ClimateForesightRunFactory(
            planning_area=self.planning_area,
            created_by=self.user,
            name="Test Run",
            status="running",
        )

        request = self.factory.get("/")
        request.user = self.user

        serializer = ClimateForesightRunSerializer(run, context={"request": request})
        data = serializer.data

        self.assertEqual(data["name"], "Test Run")
        self.assertEqual(data["planning_area"], self.planning_area.id)
        self.assertEqual(data["planning_area_name"], self.planning_area.name)
        self.assertEqual(data["status"], "running")
        self.assertEqual(data["creator"], "Test User")
        self.assertIn("created_at", data)
        self.assertIn("id", data)

    def test_creator_field_with_full_name(self):
        user_with_name = UserFactory(
            username="fullnameuser", first_name="John", last_name="Doe"
        )
        run = ClimateForesightRunFactory(
            created_by=user_with_name, planning_area=self.planning_area
        )

        request = self.factory.get("/")
        request.user = user_with_name

        serializer = ClimateForesightRunSerializer(run, context={"request": request})
        self.assertEqual(serializer.data["creator"], "John Doe")

    def test_creator_field_without_full_name(self):
        user_no_name = UserFactory(username="noname", first_name="", last_name="")
        run = ClimateForesightRunFactory(
            created_by=user_no_name, planning_area=self.planning_area
        )

        request = self.factory.get("/")
        request.user = user_no_name

        serializer = ClimateForesightRunSerializer(run, context={"request": request})
        self.assertEqual(serializer.data["creator"], "noname")

    def test_creator_field_with_partial_name(self):
        user_partial = UserFactory(
            username="partialuser", first_name="Jane", last_name=""
        )
        run = ClimateForesightRunFactory(
            created_by=user_partial, planning_area=self.planning_area
        )

        request = self.factory.get("/")
        request.user = user_partial

        serializer = ClimateForesightRunSerializer(run, context={"request": request})
        self.assertEqual(serializer.data["creator"], "partialuser")

    def test_validate_planning_area_access(self):
        request = self.factory.post("/")
        request.user = self.user

        data = {
            "name": "New Run",
            "planning_area": self.planning_area.id,
            "status": "draft",
        }

        serializer = ClimateForesightRunSerializer(
            data=data, context={"request": request}
        )

        self.assertTrue(serializer.is_valid())

    def test_validate_planning_area_no_access(self):
        request = self.factory.post("/")
        request.user = self.user

        data = {
            "name": "New Run",
            "planning_area": self.other_planning_area.id,
            "status": "draft",
        }

        serializer = ClimateForesightRunSerializer(
            data=data, context={"request": request}
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("planning_area", serializer.errors)
        self.assertEqual(
            serializer.errors["planning_area"][0],
            "You don't have access to this planning area.",
        )

    def test_read_only_fields(self):
        request = self.factory.post("/")
        request.user = self.user

        data = {
            "name": "New Run",
            "planning_area": self.planning_area.id,
            "status": "draft",
            "id": 999,
            "created_at": "2024-01-01T00:00:00Z",
            "planning_area_name": "Should be ignored",
            "creator": "Should be ignored",
        }

        serializer = ClimateForesightRunSerializer(
            data=data, context={"request": request}
        )

        self.assertTrue(serializer.is_valid())
        instance = serializer.save()

        self.assertNotEqual(instance.id, 999)
        self.assertIsNotNone(instance.created_at)
        self.assertEqual(instance.created_by, self.user)

    def test_hidden_user_field(self):
        request = self.factory.post("/")
        request.user = self.user

        data = {
            "name": "New Run",
            "planning_area": self.planning_area.id,
            "status": "draft",
            "input_datalayers": [],
        }

        serializer = ClimateForesightRunSerializer(
            data=data, context={"request": request}
        )

        self.assertTrue(serializer.is_valid())
        instance = serializer.save()
        self.assertEqual(instance.created_by, self.user)

    def test_serialize_with_input_datalayers(self):
        run = ClimateForesightRunFactory(
            planning_area=self.planning_area,
            created_by=self.user,
            name="Test Run",
        )
        datalayer1 = DataLayerFactory()
        datalayer2 = DataLayerFactory()
        ClimateForesightRunInputDataLayerFactory(
            run=run, datalayer=datalayer1, favor_high=True, pillar="Ecological"
        )
        ClimateForesightRunInputDataLayerFactory(
            run=run, datalayer=datalayer2, favor_high=False, pillar="Social"
        )

        request = self.factory.get("/")
        request.user = self.user

        serializer = ClimateForesightRunSerializer(run, context={"request": request})
        data = serializer.data

        self.assertIn("input_datalayers", data)
        self.assertEqual(len(data["input_datalayers"]), 2)
        self.assertEqual(data["input_datalayers"][0]["datalayer"], datalayer1.id)
        self.assertEqual(data["input_datalayers"][0]["favor_high"], True)
        self.assertEqual(data["input_datalayers"][0]["pillar"], "Ecological")

    def test_create_with_input_datalayers(self):
        request = self.factory.post("/")
        request.user = self.user

        datalayer1 = DataLayerFactory()
        datalayer2 = DataLayerFactory()

        data = {
            "name": "New Run",
            "planning_area": self.planning_area.id,
            "status": "draft",
            "input_datalayers": [
                {
                    "datalayer": datalayer1.id,
                    "favor_high": True,
                    "pillar": "Ecological",
                },
                {"datalayer": datalayer2.id, "favor_high": False, "pillar": "Economic"},
            ],
        }

        serializer = ClimateForesightRunSerializer(
            data=data, context={"request": request}
        )

        self.assertTrue(serializer.is_valid())
        instance = serializer.save()

        self.assertEqual(instance.input_datalayers.count(), 2)
        input_dl1 = instance.input_datalayers.get(datalayer=datalayer1)
        self.assertTrue(input_dl1.favor_high)
        self.assertEqual(input_dl1.pillar, "Ecological")

    def test_update_with_input_datalayers(self):
        run = ClimateForesightRunFactory(
            planning_area=self.planning_area, created_by=self.user
        )
        old_datalayer = DataLayerFactory()
        ClimateForesightRunInputDataLayerFactory(
            run=run, datalayer=old_datalayer, favor_high=True, pillar="Ecological"
        )

        request = self.factory.put("/")
        request.user = self.user

        new_datalayer = DataLayerFactory()
        data = {
            "name": run.name,
            "planning_area": self.planning_area.id,
            "status": run.status,
            "input_datalayers": [
                {"datalayer": new_datalayer.id, "favor_high": False, "pillar": "Social"}
            ],
        }

        serializer = ClimateForesightRunSerializer(
            run, data=data, context={"request": request}
        )

        self.assertTrue(serializer.is_valid())
        instance = serializer.save()

        self.assertEqual(instance.input_datalayers.count(), 1)
        input_dl = instance.input_datalayers.first()
        self.assertEqual(input_dl.datalayer, new_datalayer)
        self.assertFalse(input_dl.favor_high)
        self.assertEqual(input_dl.pillar, "Social")


class ClimateForesightRunListSerializerTest(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = UserFactory(
            username="testuser", first_name="Test", last_name="User"
        )
        self.planning_area = PlanningAreaFactory(user=self.user)

    def test_list_serializer_fields(self):
        run = ClimateForesightRunFactory(
            planning_area=self.planning_area,
            created_by=self.user,
            name="List Test",
            status="done",
        )

        serializer = ClimateForesightRunListSerializer(run)
        data = serializer.data

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

        self.assertEqual(data["name"], "List Test")
        self.assertEqual(data["status"], "done")
        self.assertEqual(data["planning_area_name"], self.planning_area.name)
        self.assertEqual(data["creator"], "Test User")

    def test_list_serializer_read_only(self):
        serializer = ClimateForesightRunListSerializer()
        read_only_fields = ["id", "created_at", "planning_area_name", "creator"]

        for field_name in read_only_fields:
            self.assertTrue(
                serializer.fields[field_name].read_only,
                f"Field {field_name} should be read-only",
            )

    def test_list_serializer_multiple_items(self):
        runs = ClimateForesightRunFactory.create_batch(
            3, planning_area=self.planning_area, created_by=self.user
        )

        serializer = ClimateForesightRunListSerializer(runs, many=True)
        data = serializer.data

        self.assertEqual(len(data), 3)
        for item in data:
            self.assertIn("id", item)
            self.assertIn("name", item)
            self.assertIn("status", item)
