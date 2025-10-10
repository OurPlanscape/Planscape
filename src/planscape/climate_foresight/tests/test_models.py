from django.test import TestCase
from django.db import IntegrityError
from climate_foresight.models import (
    ClimateForesightRun,
    ClimateForesightRunInputDataLayer,
)
from climate_foresight.tests.factories import (
    ClimateForesightRunFactory,
    ClimateForesightRunInputDataLayerFactory,
)
from datasets.tests.factories import DataLayerFactory
from planning.tests.factories import PlanningAreaFactory
from planscape.tests.factories import UserFactory


class ClimateForesightRunModelTest(TestCase):
    def setUp(self):
        self.user = UserFactory()
        self.other_user = UserFactory()
        self.planning_area = PlanningAreaFactory(user=self.user)
        self.other_planning_area = PlanningAreaFactory(user=self.other_user)

    def test_create_climate_foresight_run(self):
        run = ClimateForesightRun.objects.create(
            planning_area=self.planning_area,
            name="Test Analysis",
            created_by=self.user,
            status="draft",
        )

        self.assertEqual(run.name, "Test Analysis")
        self.assertEqual(run.planning_area, self.planning_area)
        self.assertEqual(run.created_by, self.user)
        self.assertEqual(run.status, "draft")
        self.assertIsNotNone(run.created_at)

    def test_string_representation(self):
        run = ClimateForesightRunFactory(
            name="Climate Impact Study", planning_area=self.planning_area
        )
        expected = f"Climate Impact Study - {self.planning_area.name}"
        self.assertEqual(str(run), expected)

    def test_default_status(self):
        run = ClimateForesightRun.objects.create(
            planning_area=self.planning_area, name="Test Analysis", created_by=self.user
        )
        self.assertEqual(run.status, "draft")

    def test_status_choices(self):
        valid_statuses = ["draft", "running", "done"]

        for status in valid_statuses:
            run = ClimateForesightRun.objects.create(
                planning_area=self.planning_area,
                name=f"Run {status}",
                created_by=self.user,
                status=status,
            )
            self.assertEqual(run.status, status)

    def test_ordering_by_created_at(self):
        run1 = ClimateForesightRunFactory(
            planning_area=self.planning_area, created_by=self.user
        )
        run2 = ClimateForesightRunFactory(
            planning_area=self.planning_area, created_by=self.user
        )
        run3 = ClimateForesightRunFactory(
            planning_area=self.planning_area, created_by=self.user
        )

        runs = ClimateForesightRun.objects.all()
        self.assertEqual(runs[0], run3)
        self.assertEqual(runs[1], run2)
        self.assertEqual(runs[2], run1)

    def test_soft_delete_planning_area_keeps_run(self):
        """Test that soft deleting a planning area does not delete the run."""
        run = ClimateForesightRunFactory(
            planning_area=self.planning_area, created_by=self.user
        )
        run_id = run.id

        # PlanningArea uses soft delete by default
        self.planning_area.delete()

        # Run should still exist since planning area was soft deleted
        self.assertTrue(ClimateForesightRun.objects.filter(id=run_id).exists())

        # But the planning area is marked as deleted
        self.planning_area.refresh_from_db()
        self.assertIsNotNone(self.planning_area.deleted_at)

    def test_cascade_delete_with_user(self):
        test_user = UserFactory()
        run = ClimateForesightRunFactory(
            planning_area=self.planning_area, created_by=test_user
        )
        run_id = run.id

        test_user.delete()

        self.assertFalse(ClimateForesightRun.objects.filter(id=run_id).exists())


class ClimateForesightRunManagerTest(TestCase):
    def setUp(self):
        self.user1 = UserFactory()
        self.user2 = UserFactory()
        self.planning_area1 = PlanningAreaFactory(user=self.user1)
        self.planning_area2 = PlanningAreaFactory(user=self.user1)
        self.planning_area3 = PlanningAreaFactory(user=self.user2)

        self.run1 = ClimateForesightRunFactory(
            planning_area=self.planning_area1, created_by=self.user1, name="Run 1"
        )
        self.run2 = ClimateForesightRunFactory(
            planning_area=self.planning_area1, created_by=self.user1, name="Run 2"
        )
        self.run3 = ClimateForesightRunFactory(
            planning_area=self.planning_area2, created_by=self.user1, name="Run 3"
        )
        self.run4 = ClimateForesightRunFactory(
            planning_area=self.planning_area3, created_by=self.user2, name="Run 4"
        )

    def test_list_by_user(self):
        user1_runs = ClimateForesightRun.objects.list_by_user(self.user1)
        user2_runs = ClimateForesightRun.objects.list_by_user(self.user2)

        self.assertEqual(user1_runs.count(), 3)
        self.assertIn(self.run1, user1_runs)
        self.assertIn(self.run2, user1_runs)
        self.assertIn(self.run3, user1_runs)
        self.assertNotIn(self.run4, user1_runs)

        self.assertEqual(user2_runs.count(), 1)
        self.assertIn(self.run4, user2_runs)

    def test_list_by_planning_area(self):
        pa1_runs = ClimateForesightRun.objects.list_by_planning_area(
            self.planning_area1, self.user1
        )
        pa2_runs = ClimateForesightRun.objects.list_by_planning_area(
            self.planning_area2, self.user1
        )

        self.assertEqual(pa1_runs.count(), 2)
        self.assertIn(self.run1, pa1_runs)
        self.assertIn(self.run2, pa1_runs)

        self.assertEqual(pa2_runs.count(), 1)
        self.assertIn(self.run3, pa2_runs)

    def test_list_by_planning_area_filters_by_user(self):
        pa3_runs = ClimateForesightRun.objects.list_by_planning_area(
            self.planning_area3, self.user1
        )

        self.assertEqual(pa3_runs.count(), 0)


class ClimateForesightRunInputDataLayerTest(TestCase):
    def setUp(self):
        self.user = UserFactory()
        self.planning_area = PlanningAreaFactory(user=self.user)
        self.run = ClimateForesightRunFactory(
            planning_area=self.planning_area, created_by=self.user
        )
        self.datalayer = DataLayerFactory()

    def test_create_input_datalayer(self):
        input_dl = ClimateForesightRunInputDataLayer.objects.create(
            run=self.run,
            datalayer=self.datalayer,
            favor_high=True,
            pillar="Ecological",
        )

        self.assertEqual(input_dl.run, self.run)
        self.assertEqual(input_dl.datalayer, self.datalayer)
        self.assertTrue(input_dl.favor_high)
        self.assertEqual(input_dl.pillar, "Ecological")
        self.assertIsNotNone(input_dl.created_at)

    def test_string_representation(self):
        input_dl = ClimateForesightRunInputDataLayerFactory(
            run=self.run,
            datalayer=self.datalayer,
            pillar="Social",
        )
        expected = f"{self.run.name} - {self.datalayer.name} (Social)"
        self.assertEqual(str(input_dl), expected)

    def test_unique_constraint(self):
        ClimateForesightRunInputDataLayerFactory(
            run=self.run,
            datalayer=self.datalayer,
            favor_high=True,
            pillar="Ecological",
        )

        with self.assertRaises(IntegrityError):
            ClimateForesightRunInputDataLayer.objects.create(
                run=self.run,
                datalayer=self.datalayer,
                favor_high=False,
                pillar="Social",
            )

    def test_cascade_delete_with_run(self):
        input_dl = ClimateForesightRunInputDataLayerFactory(run=self.run)
        input_dl_id = input_dl.id

        self.run.delete()

        self.assertFalse(
            ClimateForesightRunInputDataLayer.objects.filter(id=input_dl_id).exists()
        )

    def test_cascade_delete_with_datalayer(self):
        input_dl = ClimateForesightRunInputDataLayerFactory(datalayer=self.datalayer)
        input_dl_id = input_dl.id

        # DataLayer uses soft delete, so input_datalayer should still exist
        self.datalayer.delete()

        # Input datalayer should still exist since datalayer was soft deleted
        self.assertTrue(
            ClimateForesightRunInputDataLayer.objects.filter(id=input_dl_id).exists()
        )

        # But the datalayer is marked as deleted
        self.datalayer.refresh_from_db()
        self.assertIsNotNone(self.datalayer.deleted_at)

    def test_related_name_input_datalayers(self):
        ClimateForesightRunInputDataLayerFactory(run=self.run)
        ClimateForesightRunInputDataLayerFactory(run=self.run)

        self.assertEqual(self.run.input_datalayers.count(), 2)
