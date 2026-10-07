from typing import Optional

from core.serializers import MultiSerializerMixin
from datasets.filters import DataLayerFilterSet
from datasets.models import (
    DataLayer,
    DataLayerType,
    Dataset,
    SimpleCategory,
    VisibilityOptions,
)
from datasets.serializers import (
    BrowseDataLayerSerializer,
    BrowseDataSetSerializer,
    DataLayerSerializer,
    DatasetSerializer,
    FindAnythingSerializer,
    SearchResultsSerializer,
    SimpleCategorySerializer,
)
from datasets.services import browse, browse_simple_category, find_anything
from django.conf import settings
from django.contrib.gis.geos import GEOSGeometry
from django.contrib.postgres.search import SearchQuery, SearchVector
from django.db.models import Q
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.mixins import ListModelMixin, RetrieveModelMixin
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.permissions import AllowAny, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

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
        serializer = BrowseDataSetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        results = self._get_browse_result(
            dataset,
            type=serializer.validated_data.get("type"),
            module=serializer.validated_data.get("module"),
            geometry=serializer.validated_data.get("geometry"),
            search_tab=serializer.validated_data.get("search_tab"),
        )
        serializer = BrowseDataLayerSerializer(results, many=True)
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
    ):
        dataset = self.get_object()
        datalayers = browse(
            dataset,
            type=type,
            module=module,
            geometry=geometry,
            search_tab=search_tab,
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
        serializer = BrowseDataSetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        results = browse_simple_category(
            category,
            type=serializer.validated_data.get("type"),
            module=serializer.validated_data.get("module"),
            geometry=serializer.validated_data.get("geometry"),
            search_tab=serializer.validated_data.get("search_tab"),
            user=request.user,
        )
        serializer = BrowseDataLayerSerializer(list(results.all()), many=True)
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
        request=FindAnythingSerializer,
        responses={200: SearchResultsSerializer(many=True)},
    )
    @action(detail=False, methods=["post"], permission_classes=[AllowAny])
    def find_anything(self, request):
        serializer = FindAnythingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        results = find_anything(user=request.user, **serializer.validated_data)
        search_results = list(results.values())

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

        if self.action == "urls":
            return DataLayer.objects.filter(
                Q(dataset__visibility=VisibilityOptions.PUBLIC)
                | Q(dataset_id=settings.CLIMATE_FORESIGHT_DATASET_ID)
                | Q(dataset__modules__contains=["funding_report"])
            )

        queryset = DataLayer.objects.all().accessible_by(user)

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
