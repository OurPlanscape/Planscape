from django.test import TestCase
from climate_foresight.models import ClimateForesight
from climate_foresight.tests.factories import ClimateForesightFactory
from planning.tests.factories import PlanningAreaFactory
from planscape.tests.factories import UserFactory


class ClimateForesightModelTest(TestCase):
    def setUp(self):
        self.user = UserFactory()
        self.other_user = UserFactory()
        self.planning_area = PlanningAreaFactory(user=self.user)
        self.other_planning_area = PlanningAreaFactory(user=self.other_user)

    def test_create_climate_foresight_analysis(self):
        analysis = ClimateForesight.objects.create(
            planning_area=self.planning_area,
            name="Test Analysis",
            user=self.user,
            status='draft'
        )

        self.assertEqual(analysis.name, "Test Analysis")
        self.assertEqual(analysis.planning_area, self.planning_area)
        self.assertEqual(analysis.user, self.user)
        self.assertEqual(analysis.status, 'draft')
        self.assertIsNotNone(analysis.created_at)

    def test_string_representation(self):
        analysis = ClimateForesightFactory(
            name="Climate Impact Study",
            planning_area=self.planning_area
        )
        expected = f"Climate Impact Study - {self.planning_area.name}"
        self.assertEqual(str(analysis), expected)

    def test_default_status(self):
        analysis = ClimateForesight.objects.create(
            planning_area=self.planning_area,
            name="Test Analysis",
            user=self.user
        )
        self.assertEqual(analysis.status, 'draft')

    def test_status_choices(self):
        valid_statuses = ['draft', 'running', 'done']

        for status in valid_statuses:
            analysis = ClimateForesight.objects.create(
                planning_area=self.planning_area,
                name=f"Analysis {status}",
                user=self.user,
                status=status
            )
            self.assertEqual(analysis.status, status)

    def test_ordering_by_created_at(self):
        analysis1 = ClimateForesightFactory(
            planning_area=self.planning_area,
            user=self.user
        )
        analysis2 = ClimateForesightFactory(
            planning_area=self.planning_area,
            user=self.user
        )
        analysis3 = ClimateForesightFactory(
            planning_area=self.planning_area,
            user=self.user
        )

        analyses = ClimateForesight.objects.all()
        self.assertEqual(analyses[0], analysis3)
        self.assertEqual(analyses[1], analysis2)
        self.assertEqual(analyses[2], analysis1)

    def test_soft_delete_planning_area_keeps_analysis(self):
        """Test that soft deleting a planning area does not delete the analysis."""
        analysis = ClimateForesightFactory(
            planning_area=self.planning_area,
            user=self.user
        )
        analysis_id = analysis.id

        # PlanningArea uses soft delete by default
        self.planning_area.delete()

        # Analysis should still exist since planning area was soft deleted
        self.assertTrue(
            ClimateForesight.objects.filter(id=analysis_id).exists()
        )

        # But the planning area is marked as deleted
        self.planning_area.refresh_from_db()
        self.assertIsNotNone(self.planning_area.deleted_at)

    def test_cascade_delete_with_user(self):
        test_user = UserFactory()
        analysis = ClimateForesightFactory(
            planning_area=self.planning_area,
            user=test_user
        )
        analysis_id = analysis.id

        test_user.delete()

        self.assertFalse(
            ClimateForesight.objects.filter(id=analysis_id).exists()
        )


class ClimateForesightManagerTest(TestCase):
    def setUp(self):
        self.user1 = UserFactory()
        self.user2 = UserFactory()
        self.planning_area1 = PlanningAreaFactory(user=self.user1)
        self.planning_area2 = PlanningAreaFactory(user=self.user1)
        self.planning_area3 = PlanningAreaFactory(user=self.user2)

        self.analysis1 = ClimateForesightFactory(
            planning_area=self.planning_area1,
            user=self.user1,
            name="Analysis 1"
        )
        self.analysis2 = ClimateForesightFactory(
            planning_area=self.planning_area1,
            user=self.user1,
            name="Analysis 2"
        )
        self.analysis3 = ClimateForesightFactory(
            planning_area=self.planning_area2,
            user=self.user1,
            name="Analysis 3"
        )
        self.analysis4 = ClimateForesightFactory(
            planning_area=self.planning_area3,
            user=self.user2,
            name="Analysis 4"
        )

    def test_list_by_user(self):
        user1_analyses = ClimateForesight.objects.list_by_user(self.user1)
        user2_analyses = ClimateForesight.objects.list_by_user(self.user2)

        self.assertEqual(user1_analyses.count(), 3)
        self.assertIn(self.analysis1, user1_analyses)
        self.assertIn(self.analysis2, user1_analyses)
        self.assertIn(self.analysis3, user1_analyses)
        self.assertNotIn(self.analysis4, user1_analyses)

        self.assertEqual(user2_analyses.count(), 1)
        self.assertIn(self.analysis4, user2_analyses)

    def test_list_by_planning_area(self):
        pa1_analyses = ClimateForesight.objects.list_by_planning_area(
            self.planning_area1, self.user1
        )
        pa2_analyses = ClimateForesight.objects.list_by_planning_area(
            self.planning_area2, self.user1
        )

        self.assertEqual(pa1_analyses.count(), 2)
        self.assertIn(self.analysis1, pa1_analyses)
        self.assertIn(self.analysis2, pa1_analyses)

        self.assertEqual(pa2_analyses.count(), 1)
        self.assertIn(self.analysis3, pa2_analyses)

    def test_list_by_planning_area_filters_by_user(self):
        pa3_analyses = ClimateForesight.objects.list_by_planning_area(
            self.planning_area3, self.user1
        )

        self.assertEqual(pa3_analyses.count(), 0)