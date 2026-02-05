import json
from typing import List, Optional

import markdown
from collaboration.services import get_permissions, get_role
from datasets.models import DataLayer, DataLayerType, GeometryType
from django.conf import settings
from django.contrib.gis.geos import GEOSGeometry, MultiPolygon, Polygon
from django.utils import timezone
from planscape.exceptions import InvalidGeometry
from rest_framework import serializers
from rest_framework_gis import serializers as gis_serializers
from stands.models import StandSizeChoices

from planning.geometry import coerce_geojson, coerce_geometry
from planning.models import (
    PlanningArea,
    PlanningAreaNote,
    ProjectArea,
    Scenario,
    ScenarioPlanningApproach,
    ScenarioResult,
    ScenarioType,
    SharedLink,
    TreatmentGoal,
    TreatmentGoalCategory,
    TreatmentGoalGroup,
    TreatmentGoalUsageType,
    TreatmentGoalUsesDataLayer,
    User,
    UserPrefs,
)
from planning.services import get_acreage, planning_area_covers, union_geojson


class ListPlanningAreaSerializer(serializers.ModelSerializer):
    region_name = serializers.SerializerMethodField(
        help_text="Region choice name of the Planning Area."
    )
    # latest_updated takes into account the plan's scenario's updated timestamps and should
    # be used by clients rather than the row-level updated_at field.
    latest_updated = serializers.SerializerMethodField(
        help_text="Last update date and time in UTC."
    )
    notes = serializers.CharField(
        required=False, help_text="Notes of the Planning Area."
    )
    created_at = serializers.DateTimeField(
        required=False, help_text="Creation date and time in UTC."
    )

    area_acres = serializers.SerializerMethodField(
        help_text="Area of the Planning Area represented in Acres."
    )
    creator = serializers.CharField(
        source="creator_name", help_text="User ID that created the Planning Area."
    )
    permissions = serializers.SerializerMethodField(
        help_text="Requester permissions for the Planning Area."
    )
    role = serializers.SerializerMethodField(
        help_text="Requester role in the Planning Area."
    )

    def get_region_name(self, instance):
        return instance.get_region_name_display()

    def get_area_acres(self, instance):
        return get_acreage(instance.geometry)

    def get_latest_updated(self, instance):
        return instance.updated_at

    def get_role(self, instance):
        user = self.context["request"].user or self.request.user
        return get_role(user, instance)

    def get_permissions(self, instance):
        user = self.context["request"].user or self.request.user
        return list(get_permissions(user, instance))

    class Meta:
        fields = (
            "id",
            "user",
            "name",
            "notes",
            "region_name",
            "scenario_count",
            "capabilities",
            "latest_updated",
            "created_at",
            "area_acres",
            "creator",
            "role",
            "permissions",
            "map_status",
        )
        model = PlanningArea


class CreatePlanningAreaSerializer(serializers.ModelSerializer):
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())
    geometry = serializers.JSONField()
    region_name = serializers.ChoiceField(
        choices=PlanningArea._meta.get_field("region_name").choices,
        required=False,
        allow_null=True,
    )

    def validate(self, attrs):
        region_val = attrs.get("region_name")
        if PlanningArea.objects.filter(
            user=attrs["user"],
            name=attrs["name"],
            region_name=region_val,
        ).exists():
            raise serializers.ValidationError(
                {"name": "A planning area with this name already exists."}
            )
        if "region_name" not in self.initial_data:
            attrs.pop("region_name", None)
        return attrs

    def validate_geometry(self, geom):
        if not isinstance(geom, GEOSGeometry):
            try:
                geom = coerce_geojson(geom)

            except InvalidGeometry as exc:
                if "exactly one feature" in str(exc):
                    merged = union_geojson(geom)

                    if isinstance(merged, GEOSGeometry):
                        geom = merged
                    else:
                        geom = coerce_geojson(merged)
                else:
                    raise

        if geom.srid != settings.DEFAULT_CRS:
            geom = geom.transform(settings.DEFAULT_CRS, clone=True)

        try:
            return coerce_geometry(geom)
        except (InvalidGeometry, ValueError) as exc:
            raise serializers.ValidationError(str(exc))

    class Meta:
        model = PlanningArea
        fields = (
            "user",
            "name",
            "region_name",
            "geometry",
            "notes",
        )
        validators = []


class UpdatePlanningAreaSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        if not attrs.get("name"):
            raise serializers.ValidationError(
                {"name": "A planning area name is required."}
            )
        instance = self.instance
        if (
            PlanningArea.objects.filter(
                user=instance.user,
                name=attrs["name"],
            )
            .exclude(id=instance.pk)
            .exists()
        ):
            raise serializers.ValidationError(
                {"name": "A planning area with this name already exists."}
            )
        return attrs

    class Meta:
        model = PlanningArea
        fields = ("name",)

    def update(self, instance, validated_data):
        instance.name = validated_data.get("name")
        instance.updated_at = timezone.now()
        instance.save(update_fields=["name", "updated_at"])
        return instance


class PlanningAreaSerializer(
    ListPlanningAreaSerializer,
    gis_serializers.GeoModelSerializer,
):
    class Meta:
        fields = (
            "id",
            "user",
            "name",
            "notes",
            "region_name",
            "scenario_count",
            "capabilities",
            "latest_updated",
            "created_at",
            "area_acres",
            "creator",
            "role",
            "permissions",
            "geometry",
            "map_status",
        )
        model = PlanningArea
        geo_field = "geometry"


class ValidatePlanningAreaSerializer(gis_serializers.GeoModelSerializer):
    geometry = gis_serializers.GeometryField()

    def validate_geometry(self, geometry):
        try:
            geometry = coerce_geometry(geometry)
        except (InvalidGeometry, ValueError) as valEx:
            raise serializers.ValidationError(str(valEx))

        if not geometry.valid:
            raise serializers.ValidationError(str(geometry.valid_reason))

        if geometry.srid != settings.DEFAULT_CRS:
            geometry = geometry.transform(settings.DEFAULT_CRS, clone=True)

        return geometry

    class Meta:
        model = PlanningArea
        fields = ("geometry",)


class ValidatePlanningAreaOutputSerializer(serializers.Serializer):
    area_acres = serializers.FloatField()


class PlanningAreaNoteSerializer(serializers.ModelSerializer):
    def create(self, validated_data):
        validated_data["user"] = self.context["user"] or None
        return super().create(validated_data)

    class Meta:
        fields = (
            "id",
            "created_at",
            "updated_at",
            "content",
            "planning_area",
            "user_id",
            "user_name",
        )
        model = PlanningAreaNote


class PlanningAreaNoteListSerializer(serializers.ModelSerializer):
    can_delete = serializers.SerializerMethodField()

    def get_can_delete(self, obj):
        user = self.context.get("user")
        if user:
            return (user == obj.user) or (user == obj.planning_area.user)
        return False

    class Meta:
        fields = (
            "id",
            "created_at",
            "updated_at",
            "content",
            "planning_area",
            "user_id",
            "user_name",
            "can_delete",
        )
        model = PlanningAreaNote


class ScenarioResultSerializer(serializers.ModelSerializer):
    result = serializers.SerializerMethodField()

    class Meta:
        fields = (
            "id",
            "created_at",
            "updated_at",
            "started_at",
            "completed_at",
            "status",
            "result",
            "run_details",
        )
        model = ScenarioResult

    def get_result(self, instance):
        result = instance.result
        if not result:
            return None
        features = result.get("features")
        for feature in features:
            feature["properties"].pop("text_geometry", None)
        result["features"] = features
        return result


class ConfigurationSerializer(serializers.Serializer):
    question_id = serializers.IntegerField(allow_null=True, required=False)
    weights = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=True,
        required=False,
    )
    est_cost = serializers.FloatField(
        min_value=1,
        default=2470,
        required=False,
    )
    max_budget = serializers.FloatField(
        allow_null=True,
        required=False,
    )
    max_slope = serializers.FloatField(
        min_value=0,
        max_value=100,
        allow_null=True,
        required=False,
    )
    min_distance_from_road = serializers.FloatField(
        min_value=0,
        max_value=100000,
        allow_null=True,
        required=False,
    )
    stand_size = serializers.ChoiceField(
        choices=StandSizeChoices.choices,
        default=StandSizeChoices.LARGE,
        required=False,
    )
    excluded_areas = serializers.ListField(
        child=serializers.CharField(max_length=256),
        allow_empty=True,
        min_length=0,
        required=False,
    )
    stand_thresholds = serializers.ListField(
        child=serializers.CharField(max_length=512),
        allow_empty=True,
        min_length=0,
        required=False,
    )
    global_thresholds = serializers.ListField(
        child=serializers.CharField(max_length=512),
        allow_empty=True,
        min_length=0,
        required=False,
    )
    scenario_priorities = serializers.ListField(
        child=serializers.CharField(max_length=256),
        min_length=1,
        required=False,
    )
    scenario_output_fields = serializers.ListField(
        child=serializers.CharField(max_length=256),
        min_length=1,
        required=False,
    )
    max_treatment_area_ratio = serializers.FloatField(
        min_value=100,
        required=False,
    )

    seed = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="Optional seed for reproducible randomization.",
    )

    def validate(self, attrs):
        budget = attrs.get("max_budget")
        max_area = attrs.get("max_treatment_area_ratio")

        if budget and max_area:
            raise serializers.ValidationError(
                "You should only provide `max_budget` or `max_treatment_area_ratio`."
            )

        if not budget and not max_area:
            raise serializers.ValidationError(
                "You should provide one of `max_budget` or `max_treatment_area_ratio`."
            )
        return attrs


class ConfigurationV2Serializer(serializers.Serializer):
    stand_size = serializers.ChoiceField(
        choices=StandSizeChoices.choices,
        default=StandSizeChoices.LARGE,
        required=False,
    )
    estimated_cost = serializers.FloatField(
        min_value=1,
        default=settings.DEFAULT_ESTIMATED_COST,
    )
    max_budget = serializers.FloatField(
        allow_null=True,
        required=False,
        help_text="Maximum budget, in USD, that can be used for calculating possible treatments. Either max_budget or max_area needs to be specified.",
    )
    max_area = serializers.FloatField(
        allow_null=True,
        required=False,
        help_text="Maximum area, in acres that can be treated for the entire scenario. Either max_budget or max_area needs to be specified.",
    )

    max_project_count = serializers.IntegerField(
        min_value=2,
        max_value=10,
        default=settings.DEFAULT_MAX_PROJECT_COUNT,
        help_text="Maximum number of areas that can be generated by Forsys.",
    )
    max_slope = serializers.FloatField(
        min_value=0,
        max_value=100,
        allow_null=True,
        required=False,
        help_text="Constraints areas where the maximum slope is higher than specified.",
    )
    min_distance_from_road = serializers.FloatField(
        min_value=0,
        max_value=100000,
        allow_null=True,
        required=False,
        help_text="Constraints areas where the minimum distance from a road is higher than specified.",
    )

    excluded_areas = serializers.ListField(
        source="excluded_areas_ids",
        child=serializers.IntegerField(),
        allow_empty=True,
        min_length=0,
        required=False,
    )

    seed = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="Optional seed for reproducible randomization.",
    )

class UpsertConfigurationV2Serializer(ConfigurationV2Serializer):
    excluded_areas = serializers.ListField(
        source="excluded_areas_ids",
        child=serializers.PrimaryKeyRelatedField(
            queryset=DataLayer.objects.filter(
                type=DataLayerType.VECTOR,
                geometry_type__in=[GeometryType.POLYGON, GeometryType.MULTIPOLYGON],
            ),
        ),
        allow_empty=True,
        min_length=0,
        required=False,
    )

    def validate_excluded_areas(self, excluded_areas):
        return [excluded_area.pk for excluded_area in excluded_areas]

    def update(self, instance, validated_data):
        instance.configuration = {
            **(instance.configuration or {}),
            **validated_data,
        }
        instance.save(update_fields=["configuration"])
        return instance


class ConstraintSerializer(serializers.Serializer):
    datalayer = serializers.PrimaryKeyRelatedField(
        queryset=DataLayer.objects.all(),
        required=True,
    )

    operator = serializers.ChoiceField(
        choices=["eq", "lt", "lte", "gt", "gte"],
        required=True,
    )

    value = serializers.CharField(
        max_length=16,
        required=True,
    )


class ConstraintReadSerializer(serializers.Serializer):
    datalayer = serializers.IntegerField()
    operator = serializers.ChoiceField(choices=["eq", "lt", "lte", "gt", "gte"])
    value = serializers.CharField(max_length=16)


class TargetsSerializer(serializers.Serializer):
    max_area = serializers.FloatField(
        allow_null=True,
        required=True,
        help_text="Maximum area, in acres that can be treated for the entire scenario.",
    )
    max_project_count = serializers.IntegerField(
        min_value=1,
        required=True,
        allow_null=True,
        help_text="Maximum number of areas that can be generated by Forsys.",
    )
    estimated_cost = serializers.FloatField(
        min_value=1,
        default=settings.DEFAULT_ESTIMATED_COST,
    )


class ConfigurationV3Serializer(serializers.Serializer):
    stand_size = serializers.ChoiceField(
        choices=StandSizeChoices.choices,
        required=False,
    )

    included_areas = serializers.ListField(
        source="included_areas_ids",
        child=serializers.IntegerField(),
        allow_empty=True,
        min_length=0,
        required=False,
    )

    excluded_areas = serializers.ListField(
        source="excluded_areas_ids",
        child=serializers.IntegerField(),
        allow_empty=True,
        min_length=0,
        required=False,
    )

    constraints = serializers.ListField(
        child=ConstraintReadSerializer(),
        allow_empty=True,
        required=False,
    )

    priority_objectives = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=True,
        min_length=1,
        max_length=2,
        required=False,
    )

    cobenefits = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=True,
        min_length=0,
        max_length=10,
        required=False,
    )

    sub_units_layer = serializers.IntegerField(
        required=False,
        help_text="Vector Layer ID that contains Sub Units.",
    )

    targets = TargetsSerializer(
        required=False,
        help_text="Scenario targets: max_area, max_project_count, estimated_cost.",
    )

    seed = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="Optional seed for reproducible randomization.",
    )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        for field in [
            "included_areas",
            "excluded_areas",
            "constraints",
            "priority_objectives",
            "cobenefits",
        ]:
            if field not in data or data[field] is None:
                data[field] = []
        return data


class UpsertConfigurationV3Serializer(ConfigurationV3Serializer):
    included_areas = serializers.ListField(
        source="included_areas_ids",
        child=serializers.PrimaryKeyRelatedField(
            queryset=DataLayer.objects.filter(
                type=DataLayerType.VECTOR,
                geometry_type__in=[GeometryType.POLYGON, GeometryType.MULTIPOLYGON],
            ),
        ),
        allow_empty=True,
        min_length=0,
        required=False,
    )
    excluded_areas = serializers.ListField(
        source="excluded_areas_ids",
        child=serializers.PrimaryKeyRelatedField(
            queryset=DataLayer.objects.filter(
                type=DataLayerType.VECTOR,
                geometry_type__in=[GeometryType.POLYGON, GeometryType.MULTIPOLYGON],
            ),
        ),
        allow_empty=True,
        min_length=0,
        required=False,
    )
    constraints = serializers.ListField(
        child=ConstraintSerializer(),
        allow_empty=True,
        required=False,
    )
    priority_objectives = serializers.ListField(
        child=serializers.PrimaryKeyRelatedField(queryset=DataLayer.objects.all()),
        allow_empty=True,
        min_length=1,
        max_length=2,
        required=False,
    )
    cobenefits = serializers.ListField(
        child=serializers.PrimaryKeyRelatedField(queryset=DataLayer.objects.all()),
        allow_empty=True,
        min_length=0,
        max_length=10,
        required=False,
    )
    sub_units_layer = serializers.PrimaryKeyRelatedField(
        queryset=DataLayer.objects.filter(type=DataLayerType.VECTOR).all(),
        required=False,
        help_text="Vector Layer ID that contains Sub Units.",
    )

    def update(self, instance, validated_data):
        instance.configuration = {
            **(instance.configuration or {}),
            **validated_data,
        }
        instance.save(update_fields=["configuration"])
        return instance


class TreatmentGoalUsageSerializer(serializers.ModelSerializer):
    datalayer = serializers.CharField(source="datalayer.name", read_only=True)

    class Meta:
        model = TreatmentGoalUsesDataLayer
        fields = ("usage_type", "datalayer")


class TreatmentGoalSerializer(serializers.ModelSerializer):
    description = serializers.SerializerMethodField(
        help_text="Description of the Treatment Goal on HTML format.",
    )
    category_text = serializers.SerializerMethodField(
        help_text="Text format of Treatment Goal Category.",
    )
    group_text = serializers.SerializerMethodField(
        read_only=True,
        help_text="Text format of Treatment Goal Group.",
    )
    usage_types = TreatmentGoalUsageSerializer(
        source="datalayer_usages", many=True, read_only=True
    )

    class Meta:
        model = TreatmentGoal
        fields = (
            "id",
            "name",
            "description",
            "category",
            "category_text",
            "group",
            "group_text",
            "usage_types",
        )

    def get_description(self, instance):
        if instance.description:
            return markdown.markdown(instance.description)
        return None

    def get_category_text(self, instance):
        if instance.category:
            category = TreatmentGoalCategory(instance.category)
            return category.label
        return None

    def get_group_text(self, instance):
        if instance.group:
            group = TreatmentGoalGroup(instance.group)
            return group.label
        return None


class TreatmentGoalSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = TreatmentGoal
        fields = ("id", "name")


class ListScenarioSerializer(serializers.ModelSerializer):
    notes = serializers.CharField(required=False, help_text="Notes of the Scenario.")
    updated_at = serializers.DateTimeField(
        required=False, help_text="Last update date and time in UTC."
    )
    created_at = serializers.DateTimeField(
        required=False, help_text="Scenario creation date and time in UTC."
    )
    creator = serializers.CharField(
        source="creator_name",
        read_only=True,
        help_text="Name of the creator of the Scenario.",
    )
    planning_approach = serializers.ChoiceField(
        choices=ScenarioPlanningApproach.choices,
        required=False,
        allow_null=True,
        help_text="Scenario's Planning Approach."
    )
    tx_plan_count = serializers.SerializerMethodField(help_text="Number of treatments.")
    treatment_goal = TreatmentGoalSimpleSerializer(
        read_only=True,
        help_text="Treatment goal of the scenario.",
    )
    scenario_result = ScenarioResultSerializer(
        required=False,
        read_only=True,
        source="results",
        help_text="Results of the scenario.",
    )

    max_budget = serializers.ReadOnlyField(
        source="configuration.max_budget", help_text="Max budget."
    )

    max_treatment_area = serializers.SerializerMethodField()

    bbox = serializers.SerializerMethodField()

    def get_max_treatment_area(self, obj):
        cfg = obj.configuration
        if not isinstance(cfg, dict):
            return None
        targets = cfg.get("targets")
        if isinstance(targets, dict):
            return targets.get("max_area")
        return cfg.get("max_treatment_area_ratio")

    def get_bbox(self, instance) -> Optional[List[float]]:
        geometries = list(
            [
                Polygon.from_bbox(pa.extent)
                for pa in instance.project_areas.all().values_list(
                    "geometry", flat=True
                )
            ]
        )
        try:
            polygons = MultiPolygon(*geometries, srid=geometries[0].srid)
            if polygons.empty:
                return None
            geometry = polygons.unary_union
        except IndexError:
            return None
        if not geometry:
            return None
        if geometry.empty:
            return None
        return geometry.extent

    def get_tx_plan_count(self, obj):
        return obj.tx_plans.count()

    class Meta:
        fields = (
            "id",
            "updated_at",
            "created_at",
            "planning_area",
            "max_treatment_area",
            "max_budget",
            "name",
            "notes",
            "user",
            "creator",
            "status",
            "treatment_goal",
            "scenario_result",
            "tx_plan_count",
            "bbox",
            "origin",
            "type",
            "version",
            "capabilities",
            "planning_approach",
        )
        model = Scenario


class ScenarioV2Serializer(ListScenarioSerializer, serializers.ModelSerializer):
    configuration = ConfigurationV2Serializer()
    geopackage_url = serializers.SerializerMethodField(
        help_text="URL to download the scenario's geopackage file.",
    )
    usage_types = TreatmentGoalUsageSerializer(
        source="treatment_goal.datalayer_usages", many=True, read_only=True
    )

    def get_geopackage_url(self, scenario: Scenario) -> Optional[str]:
        """
        Returns the URL to download the scenario's geopackage file.
        If the scenario is currently being exported, returns None.
        """
        return scenario.get_geopackage_url()

    class Meta:
        fields = (
            "id",
            "updated_at",
            "created_at",
            "planning_area",
            "name",
            "origin",
            "type",
            "notes",
            "configuration",
            "treatment_goal",
            "usage_types",
            "scenario_result",
            "user",
            "creator",
            "status",
            "version",
            "geopackage_url",
            "geopackage_status",
            "capabilities",
        )
        model = Scenario


class CreateScenarioV2Serializer(serializers.ModelSerializer):
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())
    treatment_goal = serializers.PrimaryKeyRelatedField(
        queryset=TreatmentGoal.objects.all(),
        required=True,
        help_text="Treatment goal of the scenario.",
    )
    configuration = UpsertConfigurationV2Serializer()

    class Meta:
        model = Scenario
        fields = (
            "user",
            "planning_area",
            "name",
            "origin",
            "type",
            "notes",
            "configuration",
            "treatment_goal",
        )


class ScenarioV3Serializer(ListScenarioSerializer, serializers.ModelSerializer):
    configuration = ConfigurationV3Serializer()
    geopackage_url = serializers.SerializerMethodField()
    usage_types = serializers.SerializerMethodField()

    def get_geopackage_url(self, scenario: Scenario) -> Optional[str]:
        """
        Returns the URL to download the scenario's geopackage file.
        If the scenario is currently being exported, returns None.
        """
        return scenario.get_geopackage_url()

    def get_usage_types(self, scenario: Scenario) -> List[dict]:
        if scenario.type == ScenarioType.CUSTOM:
            cfg = scenario.configuration or {}
            priority_ids = cfg.get("priority_objectives") or []
            cobenefit_ids = cfg.get("cobenefits") or []
            ids = [*priority_ids, *cobenefit_ids]
            if not ids:
                return []
            names = dict(DataLayer.objects.filter(pk__in=ids).values_list("id", "name"))
            return [
                *(
                    {"usage_type": TreatmentGoalUsageType.PRIORITY, "datalayer": name}
                    for name in (names.get(i) for i in priority_ids)
                    if name
                ),
                *(
                    {
                        "usage_type": TreatmentGoalUsageType.SECONDARY_METRIC,
                        "datalayer": name,
                    }
                    for name in (names.get(i) for i in cobenefit_ids)
                    if name
                ),
            ]
        if scenario.treatment_goal:
            return TreatmentGoalUsageSerializer(
                scenario.treatment_goal.datalayer_usages.all(),
                many=True,
            ).data
        return []

    class Meta:
        fields = (
            "id",
            "updated_at",
            "created_at",
            "planning_area",
            "name",
            "origin",
            "type",
            "notes",
            "configuration",
            "treatment_goal",
            "usage_types",
            "scenario_result",
            "user",
            "creator",
            "status",
            "version",
            "geopackage_url",
            "geopackage_status",
            "capabilities",
            "planning_approach",
        )
        model = Scenario


class UpsertScenarioV3Serializer(serializers.ModelSerializer):
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())
    name = serializers.CharField(max_length=100, required=True)
    type = serializers.ChoiceField(
        choices=ScenarioType.choices,
        required=True,
        write_only=True,
    )

    class Meta:
        model = Scenario
        fields = (
            "user",
            "planning_area",
            "name",
            "type",
            "origin",
            "type",
            "notes",
        )

    def update(self, instance, validated_data):
        validated_data.pop("user", None)
        return super().update(instance, validated_data)


class PatchScenarioV3Serializer(serializers.ModelSerializer):
    planning_approach = serializers.ChoiceField(
        choices=ScenarioPlanningApproach.choices,
        required=False,
        allow_null=True,
        help_text="Scenario's Planning Approach."
    )

    treatment_goal = serializers.PrimaryKeyRelatedField(
        queryset=TreatmentGoal.objects.all(),
        required=False,
        allow_null=True,
        help_text="Treatment goal of the scenario.",
    )

    configuration = UpsertConfigurationV3Serializer()

    class Meta:
        model = Scenario
        fields = ("planning_approach", "treatment_goal", "configuration")

    def validate(self, attrs):
        instance = self.instance
        scenario_type = instance.type
        planning_approach = attrs.get("planning_approach", instance.planning_approach) 
        treatment_goal = attrs.get("treatment_goal", instance.treatment_goal)
        configuration = attrs.get("configuration", {})
        # Allow updates that only change the stand_size or sub_units_layer without other validations as it is the first step
        pre_objectives_options = (
            "configuration" in attrs
            and (
                "stand_size" in configuration and (set(configuration) == {"stand_size"})
                or
                "sub_units_layer" in configuration and (set(configuration) == {"sub_units_layer"})
            )
        )
        merged_config = {**(instance.configuration or {}), **configuration}
        errors = {}

        if planning_approach in (None, ScenarioPlanningApproach.OPTIMIZE_PROJECT_AREAS) and configuration.get("sub_units_layer"):
            errors["planning_approach"] = {"configuration": "Scenarios with `Optimize Project Areas` Planning Approach cannot have Sub Units Layer set."}

        if scenario_type == ScenarioType.PRESET:
            if not treatment_goal and not pre_objectives_options:
                errors["treatment_goal"] = "Scenario has no Treatment Goal assigned."
            if "configuration" in attrs:
                if configuration.get("priority_objectives") or configuration.get("cobenefits"):
                    errors["configuration"] = (
                        "Preset scenarios cannot set `priority_objectives` or `cobenefits`."
                    )

        if scenario_type == ScenarioType.CUSTOM:
            if "treatment_goal" in attrs and treatment_goal is not None:
                errors["treatment_goal"] = "Custom scenarios cannot set a Treatment Goal."
            priority_ids = merged_config.get("priority_objectives") or []
            if not priority_ids and not pre_objectives_options:
                errors["configuration"] = {
                    "priority_objectives": "Configuration field `priority_objectives` is required."
                }

        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    def update(self, instance: Scenario, validated_data):
        if "treatment_goal" in validated_data:
            instance.treatment_goal = validated_data["treatment_goal"]

        if "configuration" in validated_data:
            cfg = instance.configuration or {}
            incoming = validated_data["configuration"]
            cfg.update(incoming)
            instance.configuration = cfg
        
        if "planning_approach" in validated_data:
            instance.planning_approach = validated_data["planning_approach"]

        instance.save(update_fields=["treatment_goal", "configuration", "planning_approach"])
        instance.refresh_from_db()
        serializer = ScenarioV3Serializer(instance)
        return serializer.data


class CreateScenarioSerializer(serializers.ModelSerializer):
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())
    treatment_goal = serializers.PrimaryKeyRelatedField(
        queryset=TreatmentGoal.objects.all(),
        required=False,
        help_text="Treatment goal of the scenario.",
    )
    configuration = ConfigurationSerializer()

    class Meta:
        model = Scenario
        fields = (
            "user",
            "planning_area",
            "name",
            "origin",
            "type",
            "notes",
            "configuration",
            "treatment_goal",
        )

    def validate(self, attrs):
        treatment_goal = attrs.get("treatment_goal")
        question_id = attrs.get("configuration", {}).get("question_id")
        if not any([question_id, treatment_goal]):
            raise serializers.ValidationError(
                "You must provide either a treatment goal or a question ID."
            )
        if question_id and not treatment_goal:
            try:
                tg = TreatmentGoal.objects.get(id=question_id)
                attrs["treatment_goal"] = tg
            except TreatmentGoal.DoesNotExist:
                raise serializers.ValidationError("Invalid treatment goal id")
        return super().validate(attrs)


class UploadedConfigurationSerializer(serializers.Serializer):
    stand_size = serializers.ChoiceField(choices=StandSizeChoices.choices)


class ScenarioSerializer(
    ListScenarioSerializer,
    serializers.ModelSerializer,
):
    configuration = serializers.SerializerMethodField()
    geopackage_url = serializers.SerializerMethodField(
        help_text="URL to download the scenario's geopackage file.",
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        origin = None
        instance = kwargs.get("instance", None)
        if hasattr(self, "initial_data") and self.initial_data:
            origin = self.initial_data.get("origin")
        elif instance and hasattr(instance, "origin"):
            origin = instance.origin

        if origin == "USER":
            self.fields["configuration"] = UploadedConfigurationSerializer()
        else:
            self.fields["configuration"] = ConfigurationSerializer()

    def create(self, validated_data):
        validated_data["user"] = self.context["user"] or None
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data["user"] = self.context["user"] or None
        return super().update(instance, validated_data)

    def get_geopackage_url(self, scenario: Scenario) -> Optional[str]:
        """
        Returns the URL to download the scenario's geopackage file.
        If the scenario is currently being exported, returns None.
        """
        return scenario.get_geopackage_url()

    class Meta:
        fields = (
            "id",
            "updated_at",
            "created_at",
            "planning_area",
            "name",
            "origin",
            "type",
            "notes",
            "configuration",
            "treatment_goal",
            "scenario_result",
            "user",
            "creator",
            "status",
            "version",
            "geopackage_url",
            "capabilities",
        )
        model = Scenario


class ProjectAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectArea
        fields = (
            "id",
            "scenario",
            "name",
            "data",
            "geometry",
            "created_by",
        )


class ScenarioAndProjectAreasSerializer(serializers.ModelSerializer):
    project_areas = ProjectAreaSerializer(many=True, read_only=True)

    class Meta:
        fields = (
            "id",
            "updated_at",
            "created_at",
            "origin",
            "type",
            "planning_area",
            "name",
            "notes",
            "user",
            "status",
            "project_areas",
            "capabilities",
        )
        model = Scenario


class SharedLinkSerializer(serializers.ModelSerializer):
    def create(self, validated_data):
        user = self.context["user"] or None
        # allow anonymous link creation, but don't include a user record on creation
        if user.is_anonymous or user is None:
            link_obj = SharedLink.objects.create(**validated_data)
        else:
            link_obj = SharedLink.objects.create(**validated_data, user=user)
        return link_obj

    class Meta:
        model = SharedLink
        fields = ("updated_at", "created_at", "link_code", "view_state", "user_id")


class UserPrefsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPrefs
        fields = ("updated_at", "created_at", "preferences", "user_id")


class ListCreatorSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField(
        help_text="Name of the creator of the Scenario.",
    )

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"

    class Meta:
        model = User
        fields = ("id", "email", "full_name")


class GeoJSONSerializer(serializers.Serializer):
    type = serializers.ChoiceField(
        choices=[
            "Feature",
            "FeatureCollection",
            "GeometryCollection",
            "LineString",
            "MultiLineString",
            "MultiPoint",
            "MultiPolygon",
            "Point",
            "Polygon",
        ]
    )
    bbox = serializers.ListField(child=serializers.FloatField(), required=False)
    coordinates = serializers.ListField(required=False)
    geometry = serializers.JSONField(required=False)
    features = serializers.ListField(child=serializers.JSONField(), required=False)
    properties = serializers.JSONField(required=False)

    def validate(self, data):
        geojson_type = data.get("type")
        if geojson_type == "Feature":
            self._validate_feature(data)
        elif geojson_type == "FeatureCollection":
            self._validate_feature_collection(data)
        elif geojson_type in [
            "Polygon",
            "MultiPolygon",
            "LineString",
            "MultiLineString",
            "Point",
            "MultiPoint",
        ]:
            self._validate_geometry(data)
        return data

    def _validate_feature(self, data):
        if "geometry" not in data:
            raise serializers.ValidationError("Feature must have a geometry field.")
        if "features" in data:
            raise serializers.ValidationError("Feature cannot have a features field.")
        self._validate_geometry(data["geometry"])

    def _validate_feature_collection(self, data):
        if "features" not in data:
            raise serializers.ValidationError(
                "FeatureCollection must have a features field."
            )
        if "geometry" in data:
            raise serializers.ValidationError(
                "FeatureCollection cannot have a geometry field."
            )
        for feature in data["features"]:
            if "geometry" in feature:
                self._validate_geometry(feature["geometry"])

    def _validate_geometry(self, value):
        try:
            GEOSGeometry(json.dumps(value) if isinstance(value, dict) else value)
        except Exception as e:
            raise serializers.ValidationError(f"Invalid geometry: {str(e)}")


class UploadedScenarioDataSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100, required=True)
    stand_size = serializers.ChoiceField(
        choices=["SMALL", "MEDIUM", "LARGE"], required=True
    )
    planning_area = serializers.IntegerField(min_value=1, required=True)
    geometry = serializers.JSONField(required=True)

    def validate(self, attrs):
        geometry = attrs.get("geometry")
        planning_area_id = attrs.get("planning_area")
        stand_size = attrs.get("stand_size")
        name = attrs.get("name")

        exists = Scenario.objects.filter(
            name=name,
            planning_area=planning_area_id,
        )
        if self.instance:
            exists = exists.exclude(pk=self.instance.pk)

        if exists.exists():
            raise serializers.ValidationError(
                {"name": "A scenario with this name already exists."}
            )

        if not self._is_inside_planning_area(geometry, planning_area_id, stand_size):
            raise serializers.ValidationError(
                "The uploaded geometry is not within the selected planning area."
            )
        return attrs

    def validate_geometry(self, value):
        # consolidate a list of feature collections into one object
        ## TODO: use built-in approaches for this
        if isinstance(value, list):
            merged_feature_collection = {"type": "FeatureCollection", "features": []}
            for fc in value:
                if fc.get("type") == "FeatureCollection":
                    merged_feature_collection["features"].extend(fc.get("features", []))
                else:
                    raise ValueError(
                        "All items must be GeoJSON FeatureCollection objects"
                    )
            value = merged_feature_collection

        # convert if neither dict nor list
        if not isinstance(value, (dict, list)):
            value = json.loads(value)

        geojson_serializer = GeoJSONSerializer(data=value)
        geojson_serializer.is_valid(raise_exception=True)
        return geojson_serializer.validated_data

    def _is_inside_planning_area(self, geometry, planning_area_id, stand_size) -> bool:
        uploaded_geos = union_geojson(geometry)
        try:
            planning_area = PlanningArea.objects.get(pk=planning_area_id)
        except PlanningArea.DoesNotExist:
            raise serializers.ValidationError("Planning area does not exist.")

        return planning_area_covers(
            planning_area=planning_area,
            geometry=uploaded_geos,
            stand_size=stand_size,
        )


class GetAvailableStandsSerializer(serializers.Serializer):
    stand_size = serializers.ChoiceField(
        choices=StandSizeChoices.choices,
        default=StandSizeChoices.LARGE,
        required=False,
    )
    includes = serializers.ListField(
        child=serializers.PrimaryKeyRelatedField(
            queryset=DataLayer.objects.all(),
        ),
        required=False,
    )
    excludes = serializers.ListField(
        child=serializers.PrimaryKeyRelatedField(
            queryset=DataLayer.objects.all(),
        ),
        required=False,
    )
    constraints = serializers.ListField(
        child=ConstraintSerializer(),
        required=False,
    )


class UnavailableStandsSerializer(serializers.Serializer):
    by_inclusions = serializers.ListField(child=serializers.IntegerField())

    by_exclusions = serializers.ListField(child=serializers.IntegerField())

    by_thresholds = serializers.ListField(child=serializers.IntegerField())


class AvailableStandsSummarySerializer(serializers.Serializer):
    total_area = serializers.FloatField()

    available_area = serializers.FloatField()

    treatable_area = serializers.FloatField()

    unavailable_area = serializers.FloatField()

    treatable_stand_count = serializers.IntegerField()


class AvailableStandsSerializer(serializers.Serializer):
    unavailable = UnavailableStandsSerializer()

    summary = AvailableStandsSummarySerializer()
