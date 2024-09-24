# from django.db import models
# from django.contrib.postgres.fields import ArrayField
# from django.contrib.auth import get_user_model
# from core.models import CreatedAtMixin, DeletedAtMixin, UUIDMixin, UpdatedAtMixin
# from metrics.models import Metric
# from projects.models import Project
# from treebeard.mp_tree import MP_Node

# User = get_user_model()


# class TreatmentGoalCategory(
#     UUIDMixin,
#     CreatedAtMixin,
#     UpdatedAtMixin,
#     DeletedAtMixin,
#     MP_Node,
# ):
#     created_by = models.ForeignKey(
#         User,
#         related_name="created_treatment_goal_categories",
#         on_delete=models.RESTRICT,
#     )

#     project = models.ForeignKey(
#         Project,
#         related_name="treatment_goal_categories",
#         on_delete=models.RESTRICT,
#     )
#     name = models.CharField(max_length=128)

#     path = models.CharField(max_length=512)
#     node_order_by = [
#         "name",
#     ]

#     class Meta:
#         constraints = [
#             models.UniqueConstraint(
#                 fields=["project", "name"],
#                 include=["path"],
#                 name="treatment_goal_category_project_unique_constraint",
#             )
#         ]

#         verbose_name = "Treatment Goal Category"
#         verbose_name_plural = "Treatment Goal Categories"


# class TreatmentGoalExecutor(models.TextChoices):
#     FORSYS = "FORSYS", "ForSys"


def get_forsys_defaults():
    return {
        "patchmax_SDW": 0.5,
        "patchmax_EPW": 0.5,
        "patchmax_exclusion_limit": 0.5,
        "patchmax_sample_frac": 0.1,
        "run_with_patchmax": True,
        "stand_threshold": [],
        "global_threshold": [],
    }


# class TreatmentGoal(
#     UUIDMixin,
#     CreatedAtMixin,
#     UpdatedAtMixin,
#     DeletedAtMixin,
#     models.Model,
# ):
#     created_by = models.ForeignKey(
#         User,
#         related_name="created_treatment_goals",
#         on_delete=models.RESTRICT,
#     )

#     project = models.ForeignKey(
#         Project,
#         related_name="treatment_goals",
#         on_delete=models.RESTRICT,
#     )

#     name = models.CharField(
#         max_length=128,
#         help_text="Name of the treatment goal. Equivalent to short_question_text.",
#     )

#     summary = models.CharField(
#         max_length=512,
#         null=True,
#         help_text="Summary of the question. Equivalent to long_question_text.",
#     )

#     description = models.TextField(
#         null=True,
#         help_text="Describes to the user how the goal is set up, how it identifies the areas and the set of thresholds, as well as notes on usage.",
#     )

#     metrics = models.ManyToManyField(
#         to=Metric,
#         related_name="treatment_goals",
#         through="MetricUsage",
#         through_fields=("treatment_goal", "metric"),
#     )

#     executor = models.CharField(
#         choices=TreatmentGoalExecutor.choices,
#         default=TreatmentGoalExecutor.FORSYS,
#         max_length=64,
#     )

#     execution_options = models.JSONField(
#         default=get_forsys_defaults,
#         help_text="Stores a map of downstream configurations to be passed to the executor. Right now only FORSYS is our executor.",
#     )


# class MetricUsageType(models.TextChoices):
#     PRIORITY = "PRIORITY", "Priority"
#     REPORTING = "REPORTING", "Reporting"


# class MetricAttribute(models.TextChoices):
#     """Determines the types of attributes
#     we have available for each metric.
#     """

#     MIN = "min", "Min"
#     MAX = "max", "Max"
#     MEAN = "mean", "Mean"
#     SUM = "sum", "Sum"
#     MAJORITY = "majority", "Majority"
#     MINORITY = "minority", "Minority"
#     COUNT = "COUNT", "Count"
#     FIELD = "FIELD", "Field"


# class PostProcessingFunction(models.TextChoices):
#     NONE = "NONE", "None"
#     PROJECT_AVERAGE = "PROJECT_AVERAGE", "Project Average"
#     PROJECT_AREA_SUM = "PROJECT_AREA_SUM", "Project Area Sum"
#     PROJECT_AVERAGE_WITH_CATEGORIES = (
#         "PROJECT_AVERAGE_WITH_CATEGORIES",
#         "Project Average with Categories",
#     )


# class PreProcessingFunction(models.TextChoices):
#     NONE = "NONE", "None"
#     SHORT_TONS_ACRE_TO_SHORT_TONS_CELL = "PROJECT_AVERAGE", "Project Average"
#     MGC_HA_TO_SHORT_MGC_CELL = "PROJECT_AREA_SUM", "Project Area Sum"


# class MetricUsage(models.Model):
#     """
#     Determines how treatment goals uses metrics.
#     Right now this does not support repeated metrics
#     in the same treatment goal.

#     Until today, we never saw that use case. Where this
#     can be possible is if the user wants to use one attribute
#     as PRIORITY and another for REPORTING (or wants to report more than
#     one attribute).
#     """

#     treatment_goal = models.ForeignKey(
#         TreatmentGoal,
#         related_name="metric_usages",
#         on_delete=models.CASCADE,
#     )

#     metric = models.ForeignKey(
#         Metric,
#         related_name="metric_usages",
#         on_delete=models.CASCADE,
#     )

#     type = models.CharField(
#         choices=MetricUsageType.choices,
#         default=MetricUsageType.PRIORITY,
#         max_length=64,
#     )

#     attribute = models.CharField(
#         choices=MetricAttribute.choices,
#         default=MetricAttribute.MEAN,
#         max_length=64,
#     )

#     pre_processing = models.CharField(
#         choices=PreProcessingFunction.choices,
#         default=PreProcessingFunction.NONE,
#         max_length=64,
#     )

#     post_processing = models.CharField(
#         choices=PostProcessingFunction.choices,
#         default=PostProcessingFunction.NONE,
#         max_length=64,
#     )

#     output_units = models.CharField(
#         max_length=128,
#         null=True,
#         help_text="Allows the user to override dataset.data_units, in the forsys reporting pages.",
#     )

#     class Meta:
#         constraints = [
#             models.UniqueConstraint(
#                 fields=[
#                     "treatment_goal",
#                     "metric",
#                 ],
#                 name="metric_usage_unique_constraint",
#             )
#         ]
