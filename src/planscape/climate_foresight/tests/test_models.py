from django.test import TestCase
from django.db import IntegrityError
from climate_foresight.models import (
    ClimateForesightPillar,
    ClimateForesightRun,
    ClimateForesightRunInputDataLayer,
    ClimateForesightRunStatus,
)
from climate_foresight.tests.factories import (
    ClimateForesightPillarFactory,
    ClimateForesightRunFactory,
    ClimateForesightRunInputDataLayerFactory,
    GlobalClimateForesightPillarFactory,
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
        pillar = GlobalClimateForesightPillarFactory(name="Ecological")
        input_dl = ClimateForesightRunInputDataLayer.objects.create(
            run=self.run,
            datalayer=self.datalayer,
            favor_high=True,
            pillar=pillar,
        )

        self.assertEqual(input_dl.run, self.run)
        self.assertEqual(input_dl.datalayer, self.datalayer)
        self.assertTrue(input_dl.favor_high)
        self.assertEqual(input_dl.pillar, pillar)
        self.assertIsNotNone(input_dl.created_at)

    def test_string_representation(self):
        input_dl = ClimateForesightRunInputDataLayerFactory(
            run=self.run,
            datalayer=self.datalayer,
        )
        expected = self.datalayer.name
        self.assertEqual(str(input_dl), expected)

    def test_unique_constraint(self):
        ClimateForesightRunInputDataLayerFactory(
            run=self.run,
            datalayer=self.datalayer,
            favor_high=True,
        )

        with self.assertRaises(IntegrityError):
            ClimateForesightRunInputDataLayer.objects.create(
                run=self.run,
                datalayer=self.datalayer,
                favor_high=False,
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


class ClimateForesightPillarModelTest(TestCase):
    def setUp(self):
        self.user = UserFactory()
        self.run = ClimateForesightRunFactory(
            created_by=self.user, status=ClimateForesightRunStatus.DRAFT
        )

    def test_create_global_pillar(self):
        """Test creating a global pillar (run=None)."""
        pillar = ClimateForesightPillar.objects.create(
            run=None,
            name="Test Global Pillar",
            order=100,
            created_by=self.user,
        )

        self.assertIsNone(pillar.run)
        self.assertEqual(pillar.name, "Test Global Pillar")
        self.assertEqual(pillar.order, 100)
        self.assertFalse(pillar.is_custom)
        self.assertFalse(pillar.can_delete())

    def test_create_custom_pillar(self):
        """Test creating a custom (run-specific) pillar."""
        pillar = ClimateForesightPillarFactory(
            run=self.run,
            name="Custom Analysis Category",
            order=1,
        )

        self.assertEqual(pillar.run, self.run)
        self.assertEqual(pillar.name, "Custom Analysis Category")
        self.assertTrue(pillar.is_custom)
        self.assertTrue(pillar.can_delete())

    def test_global_pillar_string_representation(self):
        """Test string representation of global pillar."""
        pillar = GlobalClimateForesightPillarFactory(name="Test Pillar String Rep")
        expected = "Test Pillar String Rep (Global)"
        self.assertEqual(str(pillar), expected)

    def test_custom_pillar_string_representation(self):
        """Test string representation of custom pillar."""
        pillar = ClimateForesightPillarFactory(run=self.run, name="My Pillar")
        expected = "My Pillar (Custom)"
        self.assertEqual(str(pillar), expected)

    def test_global_pillar_cannot_be_deleted(self):
        """Test that global pillars cannot be deleted according to business logic."""
        pillar = GlobalClimateForesightPillarFactory()
        self.assertFalse(pillar.can_delete())
        self.assertFalse(pillar.is_custom)

    def test_custom_pillar_can_be_deleted_in_draft_mode(self):
        """Test that custom pillars can be deleted when run is in draft mode."""
        draft_run = ClimateForesightRunFactory(status=ClimateForesightRunStatus.DRAFT)
        pillar = ClimateForesightPillarFactory(run=draft_run)

        self.assertTrue(pillar.can_delete())
        self.assertTrue(pillar.is_custom)

    def test_custom_pillar_cannot_be_deleted_when_running(self):
        """Test that custom pillars cannot be deleted when run is running."""
        running_run = ClimateForesightRunFactory(
            status=ClimateForesightRunStatus.RUNNING
        )
        pillar = ClimateForesightPillarFactory(run=running_run)

        self.assertFalse(pillar.can_delete())
        self.assertTrue(pillar.is_custom)

    def test_custom_pillar_cannot_be_deleted_when_done(self):
        """Test that custom pillars cannot be deleted when run is done."""
        done_run = ClimateForesightRunFactory(status=ClimateForesightRunStatus.DONE)
        pillar = ClimateForesightPillarFactory(run=done_run)

        self.assertFalse(pillar.can_delete())
        self.assertTrue(pillar.is_custom)

    def test_delete_raises_error_for_global_pillar(self):
        """Test that calling delete() on a global pillar raises ValueError."""
        pillar = GlobalClimateForesightPillarFactory()

        with self.assertRaises(ValueError) as context:
            pillar.delete()

        self.assertIn("Global pillars cannot be deleted", str(context.exception))

    def test_delete_raises_error_for_custom_pillar_when_running(self):
        """Test that calling delete() on a custom pillar when run is running raises ValueError."""
        running_run = ClimateForesightRunFactory(
            status=ClimateForesightRunStatus.RUNNING
        )
        pillar = ClimateForesightPillarFactory(run=running_run)

        with self.assertRaises(ValueError) as context:
            pillar.delete()

        self.assertIn("draft mode", str(context.exception))
        self.assertIn("running", str(context.exception))

    def test_delete_raises_error_for_custom_pillar_when_done(self):
        """Test that calling delete() on a custom pillar when run is done raises ValueError."""
        done_run = ClimateForesightRunFactory(status=ClimateForesightRunStatus.DONE)
        pillar = ClimateForesightPillarFactory(run=done_run)

        with self.assertRaises(ValueError) as context:
            pillar.delete()

        self.assertIn("draft mode", str(context.exception))
        self.assertIn("done", str(context.exception))

    def test_delete_succeeds_for_custom_pillar_in_draft_mode(self):
        """Test that calling delete() on a custom pillar in draft mode succeeds."""
        draft_run = ClimateForesightRunFactory(status=ClimateForesightRunStatus.DRAFT)
        pillar = ClimateForesightPillarFactory(run=draft_run)
        pillar_id = pillar.id

        pillar.delete()

        self.assertFalse(ClimateForesightPillar.objects.filter(id=pillar_id).exists())

    def test_global_pillar_unique_name_constraint(self):
        """Test that global pillar names must be unique."""
        GlobalClimateForesightPillarFactory(name="Unique Test Pillar Name")

        with self.assertRaises(IntegrityError):
            ClimateForesightPillar.objects.create(
                run=None,
                name="Unique Test Pillar Name",
                order=2,
                created_by=self.user,
            )

    def test_custom_pillar_unique_within_run(self):
        """Test that custom pillar names must be unique within a run."""
        ClimateForesightPillarFactory(run=self.run, name="Custom Category", order=1)

        with self.assertRaises(IntegrityError):
            ClimateForesightPillar.objects.create(
                run=self.run,
                name="Custom Category",
                order=2,
                created_by=self.user,
            )

    def test_custom_pillar_same_name_different_runs(self):
        """Test that custom pillars with same name can exist in different runs."""
        run1 = ClimateForesightRunFactory(created_by=self.user)
        run2 = ClimateForesightRunFactory(created_by=self.user)

        pillar1 = ClimateForesightPillarFactory(
            run=run1, name="Analysis Type A", order=1
        )
        pillar2 = ClimateForesightPillarFactory(
            run=run2, name="Analysis Type A", order=1
        )

        self.assertEqual(pillar1.name, pillar2.name)
        self.assertNotEqual(pillar1.run, pillar2.run)

    def test_pillar_cascade_delete_with_run(self):
        """Test that custom pillars are deleted when their run is deleted."""
        pillar = ClimateForesightPillarFactory(run=self.run)
        pillar_id = pillar.id

        self.run.delete()

        self.assertFalse(ClimateForesightPillar.objects.filter(id=pillar_id).exists())

    def test_pillar_ordering(self):
        """Test that pillars are ordered correctly."""
        pillar3 = GlobalClimateForesightPillarFactory(name="C Test Pillar", order=103)
        pillar1 = GlobalClimateForesightPillarFactory(name="A Test Pillar", order=101)
        pillar2 = GlobalClimateForesightPillarFactory(name="B Test Pillar", order=102)

        pillars = ClimateForesightPillar.objects.filter(
            run__isnull=True, name__contains="Test Pillar"
        ).order_by("order")
        self.assertEqual(list(pillars), [pillar1, pillar2, pillar3])

    def test_input_datalayer_with_pillar(self):
        """Test associating an input datalayer with a pillar."""
        pillar = GlobalClimateForesightPillarFactory(name="Biodiversity")
        datalayer = DataLayerFactory()

        input_dl = ClimateForesightRunInputDataLayer.objects.create(
            run=self.run,
            datalayer=datalayer,
            favor_high=True,
            pillar=pillar,
        )

        self.assertEqual(input_dl.pillar, pillar)
        self.assertEqual(pillar.datalayer_assignments.count(), 1)

    def test_pillar_set_null_on_delete_when_in_use(self):
        """Test that deleting a pillar sets the pillar field to null on assigned input datalayers."""
        draft_run = ClimateForesightRunFactory(status=ClimateForesightRunStatus.DRAFT)
        pillar = ClimateForesightPillarFactory(run=draft_run)
        datalayer = DataLayerFactory()

        input_dl = ClimateForesightRunInputDataLayer.objects.create(
            run=self.run,
            datalayer=datalayer,
            favor_high=True,
            pillar=pillar,
        )

        pillar.delete()

        input_dl.refresh_from_db()
        self.assertIsNone(input_dl.pillar)
