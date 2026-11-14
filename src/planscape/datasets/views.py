from typing import Optional

from core.serializers import MultiSerializerMixin
from datasets.filters import DataLayerFilterSet
from datasets.models import (
    DataLayer,
    DataLayerStatus,
    DataLayerType,
    Dataset,
    SimpleCategory,
    VisibilityOptions,
)
from datasets.serializers import (
    BrowseDataLayerSerializer,
    BrowseDataLayersSerializer,
    BrowseDataSetSerializer,
    DataLayerSerializer,
    DatasetSerializer,
    FindAnythingSerializer,
    SearchResultsSerializer,
    SimpleCategorySerializer,
    CreateWorkspaceDataLayerSerializer,
    WorkspaceDataLayerCreatedSerializer,
    WorkspaceDataLayerSerializer,
)
from datasets.services import (
    UploadsNotSupported,
    browse,
    browse_favorites,
    browse_simple_category,
    create_workspace_upload,
    delete_workspace_datalayer,
    find_anything,
    get_favorite_datalayer_ids,
)
from django.conf import settings
from django.contrib.gis.geos import GEOSGeometry
from django.contrib.postgres.search import SearchQuery, SearchVector
from django.db.models import Q
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.mixins import (
    DestroyModelMixin,
    ListModelMixin,
    RetrieveModelMixin,
)
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.permissions import (
    AllowAny,
    BasePermission,
    IsAuthenticatedOrReadOnly,
)
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from workspaces.models import Workspace
from workspaces.permissions import get_workspace_permissions

from planscape.analytics import track_event


class DatasetViewSet(ListModelMixin, MultiSerializerMixin, GenericViewSet):
    queryset = Dataset.objects.none()
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = LimitOffsetPagination
    serializer_class = DatasetSerializer
    serializer_classes = {
        "list": DatasetSerializer,
    }

    def get_queryset(self):
        user = self.request.user if self.request else None
        return (
            Dataset.objects.all()
            .accessible_by(user)
            .select_related("organization", "created_by")
        )

    @extend_schema(
        description="Returns all datalayers inside this dataset",
        request=BrowseDataSetSerializer,
        responses={
            200: BrowseDataLayerSerializer(many=True),
        },
    )
    @action(detail=True, methods=["post"], permission_classes=[AllowAny])
    def browse(self, request, pk=None):
        dataset = self.get_object()
        serializer = BrowseDataSetSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        workspace = serializer.validated_data.get("workspace")
        results = self._get_browse_result(
            dataset,
            type=serializer.validated_data.get("type"),
            module=serializer.validated_data.get("module"),
            geometry=serializer.validated_data.get("geometry"),
            search_tab=serializer.validated_data.get("search_tab"),
            workspace=workspace,
        )
        serializer = BrowseDataLayerSerializer(
            results,
            many=True,
            context={
                "favorite_datalayer_ids": get_favorite_datalayer_ids(
                    workspace, [datalayer.pk for datalayer in results]
                ),
            },
        )
        is_authenticated = request.user and request.user.is_authenticated
        track_event(
            name="datasets.dataset.browse",
            properties={
                "dataset_id": dataset.pk,
                "email": request.user.email if is_authenticated else None,
            },
            user_id=request.user.pk if is_authenticated else None,
        )
        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    def _get_browse_result(
        self,
        dataset,
        type: Optional[DataLayerType] = None,
        module: Optional[str] = None,
        geometry: Optional[GEOSGeometry] = None,
        search_tab: Optional[str] = None,
        workspace: Optional[Workspace] = None,
    ):
        dataset = self.get_object()
        datalayers = browse(
            dataset,
            type=type,
            module=module,
            geometry=geometry,
            search_tab=search_tab,
            user=self.request.user,
            workspace=workspace,
        )
        return list(datalayers.all())


class SimpleCategoryViewSet(MultiSerializerMixin, GenericViewSet):
    queryset = SimpleCategory.objects.all()
    permission_classes = [IsAuthenticatedOrReadOnly]
    serializer_class = SimpleCategorySerializer

    @extend_schema(
        description="Returns all datalayers assigned to this category",
        request=BrowseDataSetSerializer,
        responses={200: BrowseDataLayerSerializer(many=True)},
    )
    @action(detail=True, methods=["post"], permission_classes=[AllowAny])
    def browse(self, request, pk=None):
        category = self.get_object()
        serializer = BrowseDataSetSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        workspace = serializer.validated_data.get("workspace")
        results = list(
            browse_simple_category(
                category,
                type=serializer.validated_data.get("type"),
                module=serializer.validated_data.get("module"),
                geometry=serializer.validated_data.get("geometry"),
                search_tab=serializer.validated_data.get("search_tab"),
                user=request.user,
                workspace=workspace,
            ).all()
        )
        serializer = BrowseDataLayerSerializer(
            results,
            many=True,
            context={
                "favorite_datalayer_ids": get_favorite_datalayer_ids(
                    workspace, [datalayer.pk for datalayer in results]
                ),
            },
        )
        return Response(serializer.data, status=status.HTTP_200_OK)


class DataLayerViewSet(
    RetrieveModelMixin, ListModelMixin, MultiSerializerMixin, GenericViewSet
):
    queryset = DataLayer.objects.none()
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = LimitOffsetPagination
    serializer_class = DataLayerSerializer
    serializer_classes = {
        "list": DataLayerSerializer,
    }
    filterset_class = DataLayerFilterSet
    # `search` is handled ad hoc in get_queryset() below (full-text search),
    # not through the FilterSet - list it explicitly so TrackedFilterBackend
    # still tracks it.
    tracked_query_params = ["search"]

    @action(detail=True, methods=["get"])
    def urls(self, request, pk=None):
        datalayer = self.get_object()
        return Response({"layer_url": datalayer.get_map_url()})

    @extend_schema(
        description="Returns the datalayers favorited in a workspace, across "
        "all datasets.",
        request=BrowseDataLayersSerializer,
        responses={200: BrowseDataLayerSerializer(many=True)},
    )
    @action(detail=False, methods=["post"], permission_classes=[AllowAny])
    def browse(self, request):
        serializer = BrowseDataLayersSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        workspace = serializer.validated_data["workspace"]
        results = list(
            browse_favorites(
                workspace,
                type=serializer.validated_data.get("type"),
                module=serializer.validated_data.get("module"),
                geometry=serializer.validated_data.get("geometry"),
                user=request.user,
            )
        )
        serializer = BrowseDataLayerSerializer(
            results,
            many=True,
            context={
                "favorite_datalayer_ids": {datalayer.pk for datalayer in results},
            },
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        request=FindAnythingSerializer,
        responses={200: SearchResultsSerializer(many=True)},
    )
    @action(detail=False, methods=["post"], permission_classes=[AllowAny])
    def find_anything(self, request):
        serializer = FindAnythingSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        results = find_anything(user=request.user, **serializer.validated_data)
        search_results = list(results.values())

        # `find_anything` is cached, so favorites are resolved here to reflect
        # the workspace's current favorites.
        datalayer_results = [r for r in search_results if r.type == "DATALAYER"]
        favorite_ids = get_favorite_datalayer_ids(
            serializer.validated_data.get("workspace"),
            [r.id for r in datalayer_results],
        )
        for result in datalayer_results:
            result.data["is_favorite"] = (
                None if favorite_ids is None else result.id in favorite_ids
            )

        user = request.user
        is_authenticated = bool(user and user.is_authenticated)
        track_event(
            name="datasets.datalayer.find_anything",
            properties={
                "term": serializer.validated_data.get("term"),
                "type": serializer.validated_data.get("type"),
                "module": serializer.validated_data.get("module"),
                "result_count": len(search_results),
                "email": user.email if is_authenticated else None,
            },
            user_id=user.pk if is_authenticated else None,
        )

        page = self.paginate_queryset(search_results)  # type: ignore
        if page is not None:
            out_serializer = SearchResultsSerializer(
                page,
                many=True,
            )
            return self.get_paginated_response(out_serializer.data)
        out_serializer = SearchResultsSerializer(
            list(search_results),
            many=True,
        )

        return Response(out_serializer.data, status=status.HTTP_200_OK)

    def get_queryset(self):
        # TODO: afterwards we need to implement the filtering
        # by organization visibility too, so we return the public ones
        # PLUS all the datalayers accessible by the organization

        user = self.request.user if self.request else None

        # Workspace uploads only show up elsewhere once they're READY; the
        # workspace datalayers endpoint is where pending and failed ones live.
        unfinished_uploads = Q(raw_url__isnull=False) & ~Q(
            status=DataLayerStatus.READY
        )

        if self.action == "urls":
            workspace_uploads = Q(pk__in=[])
            if user and user.is_authenticated:
                workspace_uploads = Q(
                    raw_url__isnull=False,
                    workspace__user_access__user=user,
                )
            return DataLayer.objects.filter(
                Q(dataset__visibility=VisibilityOptions.PUBLIC)
                | Q(dataset_id=settings.CLIMATE_FORESIGHT_DATASET_ID)
                | Q(dataset__modules__contains=["funding_report"])
                | workspace_uploads
            ).exclude(unfinished_uploads).distinct()

        queryset = DataLayer.objects.all().accessible_by(user).exclude(
            unfinished_uploads
        )

        if self.action == "list" and (
            search_query := self.request.query_params.get("search")
        ):
            vector = SearchVector(
                "name",
                "category__name",
                "dataset__name",
                "dataset__description",
                "organization__name",
            )
            return queryset.annotate(search=vector).filter(
                search=SearchQuery(search_query)
            )

        return queryset


class WorkspaceDataLayerPermission(BasePermission):
    """Managing uploads needs `add_datalayer` in the workspace. Non-members
    get a 404 from `get_workspace`, members without it a 403."""

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        workspace = view.get_workspace()
        return "add_datalayer" in get_workspace_permissions(request.user, workspace)


class WorkspaceDataLayerViewSet(ListModelMixin, DestroyModelMixin, GenericViewSet):
    queryset = DataLayer.objects.none()
    permission_classes = [WorkspaceDataLayerPermission]
    pagination_class = LimitOffsetPagination
    serializer_class = WorkspaceDataLayerSerializer

    def get_workspace(self) -> Workspace:
        if not hasattr(self, "_workspace"):
            self._workspace = get_object_or_404(
                Workspace.objects.list_by_user(self.request.user),
                pk=self.kwargs["workspace_pk"],
            )
        return self._workspace

    def get_queryset(self):
        return (
            DataLayer.objects.filter(
                workspace=self.get_workspace(),
                raw_url__isnull=False,
            )
            .select_related("created_by")
            .order_by("-created_at")
        )

    @extend_schema(
        description="Creates a PENDING datalayer and returns a GCS resumable "
        "upload session to PUT the GeoTIFF to.",
        request=CreateWorkspaceDataLayerSerializer,
        responses={201: WorkspaceDataLayerCreatedSerializer},
    )
    def create(self, request, workspace_pk=None):
        workspace = self.get_workspace()
        serializer = CreateWorkspaceDataLayerSerializer(
            data=request.data,
            context={"workspace": workspace},
        )
        serializer.is_valid(raise_exception=True)
        origin = request.headers.get("Origin")
        if origin not in settings.CORS_ALLOWED_ORIGINS:
            origin = None
        try:
            result = create_workspace_upload(
                workspace=workspace,
                created_by=request.user,
                origin=origin,
                **serializer.validated_data,
            )
        except UploadsNotSupported as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_501_NOT_IMPLEMENTED,
            )
        return Response(
            WorkspaceDataLayerCreatedSerializer(result).data,
            status=status.HTTP_201_CREATED,
        )

    def perform_destroy(self, instance):
        delete_workspace_datalayer(instance, self.request.user)
