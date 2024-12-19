import logging
from typing import Optional
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import status
from planning.models import PlanningArea, Scenario
from impacts.models import TreatmentPlan
from collaboration.permissions import PlanningAreaPermission, ScenarioPermission


logger = logging.getLogger(__name__)


class MartinAuth(APIView):
    def _get_params(origin_uri: str) -> dict:
        try:
            query_params = {}
            items = origin_uri.split("?")[1].split("&")
            for item in items:
                key, value = item.split("=")
                query_params.update({key: value})

            return query_params
        except IndexError or Exception:
            return {}

    def get(self, request: Request):
        user = request.user
        if not user.is_authenticated:
            return Response(
                {"error": "Authentication Required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        origin_uri = request.META.get("X-Original-URI")

        if not origin_uri:
            return Response(
                {"error": "Resource required."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        query_params = self._get_params(origin_uri)  # type: ignore

        planning_area_id = query_params.get("planning_area_id")

        if planning_area_id:
            try:
                planning_area = PlanningArea.objects.get(pk=planning_area_id)
                if not PlanningAreaPermission.can_view(request.user, planning_area):
                    return Response(
                        {"error": "Forbidden access to this resource."},
                        status=status.HTTP_403_FORBIDDEN,
                    )
            except PlanningArea.DoesNotExist:
                return Response(
                    {"error": "Forbidden access to this resource."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        treatment_plan_id = query_params.get("treatment_plan_id")

        if treatment_plan_id:
            try:
                treatment_plan = TreatmentPlan.objects.select_related(
                    "scenario", "scenarion__planning_area"
                ).get(pk=treatment_plan_id)
                planning_area = treatment_plan.scenario.planning_area
                if not PlanningAreaPermission.can_view(request.user, planning_area):
                    return Response(
                        {"error": "Forbidden access to this resource."},
                        status=status.HTTP_403_FORBIDDEN,
                    )
            except TreatmentPlan.DoesNotExist:
                return Response(
                    {"error": "Forbidden access to this resource."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        scenario_id = query_params.get("scenario_id")

        if scenario_id:
            try:
                scenario = Scenario.objects.get(pk=scenario_id)
                if not ScenarioPermission.can_view(request.user, scenario):
                    return Response(
                        {"error": "Forbidden access to this resource."},
                        status=status.HTTP_403_FORBIDDEN,
                    )
            except Scenario.DoesNotExist:
                return Response(
                    {"error": "Forbidden access to this resource."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        return Response(status=status.HTTP_200_OK)
