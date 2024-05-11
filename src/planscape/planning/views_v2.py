import logging
import json
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.response import Response

from planning.models import PlanningArea, Scenario, ScenarioResult
from planning.serializers import (
    PlanningAreaSerializer,
    ListPlanningAreaSerializer,
    ListScenarioSerializer,
    ScenarioSerializer,
    CreatePlanningAreaSerializer,
)
from planning.tasks import async_forsys_run
from planning.geometry import coerce_geojson, coerce_geometry
from planning.filters import PlanningAreaFilter, ScenarioFilter
from planning.permission import PlanningAreaViewPermission, ScenarioViewPermission
from base.region_name import display_name_to_region

logger = logging.getLogger(__name__)


class PlanningAreaViewSet(viewsets.ModelViewSet):
    queryset = PlanningArea.objects.all()
    permission_classes = [PlanningAreaViewPermission]
    ordering_fields = ["name", "created_at", "scenario_count"]
    filterset_class = PlanningAreaFilter

    def create(self, request):
        try:
            body = json.loads(request.body)
            request_data = request.data
            request_data["user"] = request.user.pk
            request_data["geometry"] = coerce_geojson(body.get("geometry"))
            request_data["region_name"] = display_name_to_region(
                body.get("region_name")
            ).value
            serializer = self.get_serializer(data=request_data)
            serializer.is_valid(raise_exception=True)

            self.perform_create(serializer)

            # serializer.save()

            return Response(serializer.data)
        except Exception as e:
            logger.exception(e)
            return Response(status=400)

    def get_serializer_class(self):
        if self.action == "list":
            return ListPlanningAreaSerializer
        if self.action == "create":
            return CreatePlanningAreaSerializer
        return PlanningAreaSerializer

    def get_queryset(self):
        user = self.request.user
        qs = PlanningArea.objects.get_for_user(user)
        return qs


class ScenarioViewSet(viewsets.ModelViewSet):
    queryset = Scenario.objects.all()
    permission_classes = [ScenarioViewPermission]
    ordering_fields = ["name", "created_at"]
    filterset_class = ScenarioFilter

    def update(self, request, *args, **kwargs):
        request_data = request.data
        request_data["user"] = request.user.pk
        serializer = self.get_serializer(data=request_data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )

    def create(self, request, planningarea_pk):
        request_data = request.data
        request_data["planning_area"] = planningarea_pk
        request_data["user"] = request.user.pk
        serializer = self.get_serializer(data=request_data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # TODO: taken from old views...
        # add more tests for scenarioresult content to be sure this is working
        scenario_result = ScenarioResult.objects.create(scenario=serializer.instance)
        scenario_result.save()

        if settings.USE_CELERY_FOR_FORSYS:
            async_forsys_run.delay(serializer.instance.pk)

        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )

    def get_serializer_class(self):
        if self.action == "list":
            return ListScenarioSerializer
        return ScenarioSerializer

    def get_queryset(self):
        planningarea_pk = self.kwargs.get("planningarea_pk")
        if planningarea_pk:
            try:
                scenarios = Scenario.objects.filter(planning_area__pk=planningarea_pk)
                return scenarios
            except PlanningArea.DoesNotExist:
                return Scenario.objects.none()  # Return an empty queryset
        else:
            return Scenario.objects.none()
