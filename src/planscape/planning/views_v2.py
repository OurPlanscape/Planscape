import logging
import json
from django.contrib.auth import get_user_model
from django.contrib.gis.geos import GEOSGeometry
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, status, mixins, permissions, pagination
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet
from planning.filters import (
    PlanningAreaFilter,
    ScenarioFilter,
    PlanningAreaOrderingFilter,
    ScenarioOrderingFilter,
)
from planning.geometry import is_inside
from planning.models import PlanningArea, ProjectArea, Scenario, User
from planning.permissions import PlanningAreaViewPermission, ScenarioViewPermission
from planning.serializers import (
    CreatePlanningAreaSerializer,
    CreateScenarioSerializer,
    PlanningAreaSerializer,
    ListPlanningAreaSerializer,
    ListScenarioSerializer,
    ScenarioProjectAreasSerializer,
    ProjectAreaSerializer,
    ScenarioSerializer,
    ListCreatorSerializer,
    UploadedScenarioSerializer,
)
from planning.services import (
    create_planning_area,
    create_scenario,
    delete_planning_area,
    delete_scenario,
    toggle_scenario_status,
    create_scenario_from_upload,
)

User = get_user_model()
logger = logging.getLogger(__name__)


class PlanningAreaViewSet(viewsets.ModelViewSet):
    # this member is configured for instrospection and swagger automcatic generation
    queryset = PlanningArea.objects.none()
    permission_classes = [PlanningAreaViewPermission]
    ordering_fields = [
        "area_acres",
        "created_at",
        "creator",
        "full_name",
        "name",
        "region_name",
        "latest_updated",
        "scenario_count",
        "updated_at",
        "user",
    ]
    serializer_class = PlanningAreaSerializer
    serializer_classes = {
        "create": CreatePlanningAreaSerializer,
        "list": ListPlanningAreaSerializer,
        "retrieve": PlanningAreaSerializer,
    }
    pagination_class = pagination.LimitOffsetPagination
    filterset_class = PlanningAreaFilter
    filter_backends = [
        DjangoFilterBackend,
        PlanningAreaOrderingFilter,
        OrderingFilter,
    ]

    def get_serializer_class(self):
        return (
            self.serializer_classes.get(self.action, self.serializer_class)
            or self.serializer_class
        )

    def get_queryset(self):
        user = self.request.user
        qs = PlanningArea.objects.list_for_api(user=user).select_related("user")
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        planning_area = create_planning_area(**serializer.validated_data)
        out_serializer = PlanningAreaSerializer(
            instance=planning_area,
            context={
                "request": request,
            },
        )
        headers = self.get_success_headers(out_serializer.data)
        return Response(
            out_serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    def perform_destroy(self, instance):
        delete_planning_area(
            user=self.request.user,
            planning_area=instance,
        )


class ScenarioViewSet(viewsets.ModelViewSet):
    queryset = Scenario.objects.none()
    permission_classes = [ScenarioViewPermission]
    ordering_fields = [
        "name",
        "created_at",
        "id",
        "status",
        "budget",
        "acres",
        "completed_at",
    ]
    serializer_class = ScenarioSerializer
    serializer_classes = {
        "list": ListScenarioSerializer,
        "create": CreateScenarioSerializer,
    }
    filterset_class = ScenarioFilter
    filter_backends = [
        DjangoFilterBackend,
        ScenarioOrderingFilter,
    ]

    def get_queryset(self):
        user = self.request.user
        qs = Scenario.objects.list_by_user(user=user).select_related(
            "planning_area",
            "user",
        )
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        scenario = create_scenario(
            **serializer.validated_data,
        )
        out_serializer = ScenarioSerializer(instance=scenario)
        headers = self.get_success_headers(out_serializer.data)
        return Response(
            out_serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    def perform_destroy(self, instance):
        delete_scenario(
            user=self.request.user,
            scenario=instance,
        )

    def get_serializer_class(self):
        return (
            self.serializer_classes.get(self.action, self.serializer_class)
            or self.serializer_class
        )

    @action(methods=["post"], detail=True)
    def toggle_status(self, request, pk=None):
        scenario = self.get_object()
        toggle_scenario_status(scenario, self.request.user)
        serializer = ScenarioSerializer(instance=scenario)
        return Response(data=serializer.data)

    @action(methods=["POST"], detail=False)
    def upload_shapefiles(self, request, pk=None, *args, **kwargs):
        # stuff we expect
        stand_size = request.data["stand_size"]

        # TODO: cleanup dict vs string here

        uploaded_geom = request.data["geometry"]
        if isinstance(uploaded_geom, str):
            uploaded_geojson = json.loads(uploaded_geom)
        else:
            uploaded_geojson = uploaded_geom
        uploaded_geos = None

        # TODO: refactor this to a service
        if "features" in uploaded_geojson:
            geometries = [
                GEOSGeometry(json.dumps(feature["geometry"]))
                for feature in uploaded_geojson["features"]
            ]
            # Combine all polygons into a single polygon or multipolygon
            combined_geometry = geometries[0]
            for geom in geometries[1:]:
                combined_geometry = combined_geometry.union(geom)
                uploaded_geos = GEOSGeometry(combined_geometry, srid=4326)
        else:
            uploaded_geos = GEOSGeometry(uploaded_geom, srid=4326)

        scenario_name = request.data["name"]
        planning_area_pk = request.data["planning_area"]

        pa = PlanningArea.objects.get(pk=planning_area_pk)

        # TODO: validate uploaded geom w serializer

        if uploaded_geos.geom_type == "MultiPolygon":
            uploaded_geos = uploaded_geos.union(uploaded_geos)

        if not pa.geometry.contains(uploaded_geos):
            return Response(
                {
                    "error": "The uploaded geometry is not within the selected planning area."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        scenario_data = {
            "name": scenario_name,
            "planning_area": pa.pk,
            "user": request.user.pk,
            "configuration": {"stand_size": stand_size},
        }

        scenario_serializer = UploadedScenarioSerializer(data=scenario_data)
        scenario_serializer.is_valid(raise_exception=True)

        # now we create a scenario
        new_scenario = create_scenario_from_upload(
            scenario_data=scenario_serializer.validated_data,
            uploaded_geom=uploaded_geojson,
        )

        out_serializer = ScenarioProjectAreasSerializer(instance=new_scenario)
        headers = self.get_success_headers(out_serializer.data)
        return Response(
            out_serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )


# TODO: migrate this to an action inside the planning area viewset
class CreatorViewSet(ReadOnlyModelViewSet):
    queryset = User.objects.none()
    permission_classes = [PlanningAreaViewPermission]
    serializer_class = ListCreatorSerializer
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        pas = PlanningArea.objects.list_by_user(user=user).values_list("id", flat=True)
        return User.objects.filter(planning_areas__id__in=pas).distinct()


class ProjectAreaViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = ProjectArea.objects.all()
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    serializer_class = ProjectAreaSerializer
    serializer_classes = {
        "retrieve": ProjectAreaSerializer,
    }
