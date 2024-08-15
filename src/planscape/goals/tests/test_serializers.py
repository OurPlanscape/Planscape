from django.test import TransactionTestCase
from django.contrib.gis.geos import MultiPolygon, Polygon
from datasets.models import Dataset
from goals.models import (
    MetricAttribute,
    MetricUsageType,
    PostProcessingFunction,
    PreProcessingFunction,
    TreatmentGoal,
    MetricUsage,
    TreatmentGoalExecutor,
    get_forsys_defaults,
)
from goals.serializers import TreatmentGoalSerializer
from metrics.models import Category, Metric
from projects.models import Project
from organizations.models import Organization
from django.contrib.auth import get_user_model

User = get_user_model()


class TreatmentGoalSerializerTest(TransactionTestCase):
    def setUp(self):
        # Create a user
        self.user = User.objects.create_user(
            username="testuser", password="testpassword"
        )

        # Create an organization
        self.organization = Organization.objects.create(name="Test Organization")

        # Create a project
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.organization,
            geometry=MultiPolygon(Polygon(((0, 0), (1, 0), (1, 1), (0, 1), (0, 0)))),
        )
        # Create a metric
        self.metric = Metric.objects.create(
            created_by=self.user,
            project=self.project,
            name="Test Metric",
            display_name="Test Metric Display Name",
            dataset=Dataset.objects.create(
                created_by=self.user,
                organization=self.organization,
                name="Test Dataset",
                type="VECTOR",
                url="http://example.com",
            ),
            category=Category.add_root(
                created_by=self.user,
                organization=self.organization,
                name="Test Category",
                path="Test Path",
            ),
        )

        # Create a treatment goal
        self.treatment_goal = TreatmentGoal.objects.create(
            created_by=self.user,
            project=self.project,
            name="Test Treatment Goal",
            summary="Test Summary",
            description="Test Description",
            executor=TreatmentGoalExecutor.FORSYS,
            execution_options=get_forsys_defaults(),
        )

        # Create a metric usage
        self.metric_usage = MetricUsage.objects.create(
            treatment_goal=self.treatment_goal,
            metric=self.metric,
            type=MetricUsageType.PRIORITY,
            attribute=MetricAttribute.MEAN,
            pre_processing=PreProcessingFunction.NONE,
            post_processing=PostProcessingFunction.NONE,
            output_units="units",
        )

    def test_treatment_goal_serializer(self):
        """Test the TreatmentGoalSerializer data"""
        serializer = TreatmentGoalSerializer(instance=self.treatment_goal)
        data = serializer.data
        self.assertEqual(data["id"], self.treatment_goal.id)
        self.assertEqual(data["created_by"], self.user.id)
        self.assertEqual(data["deleted_at"], self.treatment_goal.deleted_at)
        self.assertEqual(data["organization"], self.organization.id)
        self.assertEqual(data["project"], self.project.id)
        self.assertEqual(data["name"], self.treatment_goal.name)
        self.assertEqual(data["summary"], self.treatment_goal.summary)
        self.assertEqual(data["description"], self.treatment_goal.description)
        self.assertEqual(data["executor"], self.treatment_goal.executor)
        self.assertEqual(
            data["execution_options"], self.treatment_goal.execution_options
        )

    def test_treatment_goal_serializer_update(self):
        """Test updating an existing TreatmentGoal instance using the serializer"""
        data = {
            "name": "Updated Treatment Goal",
            "summary": "Updated Summary",
            "description": "Updated Description",
        }
        serializer = TreatmentGoalSerializer(
            instance=self.treatment_goal, data=data, partial=True
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        treatment_goal = serializer.save()

        self.assertEqual(treatment_goal.name, data["name"])
        self.assertEqual(treatment_goal.summary, data["summary"])
        self.assertEqual(treatment_goal.description, data["description"])

    def test_treatment_goal_serializer_validation(self):
        """Test validation errors in the TreatmentGoalSerializer"""
        data = {
            "created_by": self.user.id,
            "project": self.project.id,
            "name": "",
            "summary": "New Summary",
            "description": "New Description",
            "executor": TreatmentGoalExecutor.FORSYS,
            "execution_options": get_forsys_defaults(),
        }
        serializer = TreatmentGoalSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("name", serializer.errors)
