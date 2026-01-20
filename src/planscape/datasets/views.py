from typing import Optional

from core.serializers import MultiSerializerMixin
from django.conf import settings
from django.contrib.gis.geos import GEOSGeometry
from django.contrib.postgres.search import SearchQuery, SearchVector
from django.db.models import Q
from drf_spectacular.utils import extend_schema
from planscape.openpanel import track_openpanel
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.mixins import ListModelMixin
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from datasets.filters import DataLayerFilterSet
from datasets.models import DataLayer, DataLayerType, Dataset, VisibilityOptions
from datasets.serializers import (
    BrowseDataLayerFilterSerializer,
    BrowseDataLayerSerializer,
    BrowseDataSetSerializer,
    DataLayerSerializer,
    DatasetSerializer,
    FindAnythingSerializer,
    SearchResultsSerializer,
)
from datasets.services import browse, find_anything


class DatasetViewSet(ListModelMixin, MultiSerializerMixin, GenericViewSet):
    queryset = Dataset.objects.none()
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = LimitOffsetPagination
    serializer_class = DatasetSerializer
    serializer_classes = {
        "list": DatasetSerializer,
    }

    def get_queryset(self):
        # TODO: afterwards we need to implement the filtering
        # by organization visibility too, so we return the public ones
        # PLUS all the datasets accessible by the organization
        match self.action:
            case "browse":
                filters = {}
            case _:
                filters = {"visibility": VisibilityOptions.PUBLIC}

        return Dataset.objects.filter(**filters).select_related(
            "organization", "created_by"
        )

    @extend_schema(
        description="Returns all datalayers inside this dataset",
        parameters=[BrowseDataLayerFilterSerializer],
        responses={
            200: BrowseDataLayerSerializer(many=True),
        },
    )
    @action(detail=True, methods=["get", "post"])
    def browse(self, request, pk=None):
        dataset = self.get_object()
        params = request.query_params if request.method == "GET" else request.data
        serializer = BrowseDataSetSerializer(data=params)
        serializer.is_valid(raise_exception=True)
        results = self._get_browse_result(
            dataset,
            type=serializer.validated_data.get("type"),
            module=serializer.validated_data.get("module"),
            geometry=serializer.validated_data.get("geometry"),
        )
        serializer = BrowseDataLayerSerializer(results, many=True)
        email = (
            request.user.email
            if request.user and hasattr(request.user, "email")
            else None
        )
        track_openpanel(
            name="datasets.dataset.browse",
            properties={
                "dataset_id": dataset.pk,
                "email": email,
            },
            user_id=request.user.pk,
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
    ):
        dataset = self.get_object()
        datalayers = browse(
            dataset,
            type=type,
            module=module,
            geometry=geometry,
        )
        return list(datalayers.all())


class DataLayerViewSet(ListModelMixin, MultiSerializerMixin, GenericViewSet):
    queryset = DataLayer.objects.none()
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = LimitOffsetPagination
    serializer_class = DataLayerSerializer
    serializer_classes = {
        "list": DataLayerSerializer,
    }
    filterset_class = DataLayerFilterSet

    @action(detail=True, methods=["get"])
    def urls(self, request, pk=None):
        datalayer = self.get_object()
        return Response({"layer_url": datalayer.get_map_url()})

    @extend_schema(
        parameters=[FindAnythingSerializer],
        responses={200: SearchResultsSerializer(many=True)},
    )
    @action(detail=False, methods=["get", "post"])
    def find_anything(self, request):
        params = request.query_params if request.method == "GET" else request.data
        serializer = FindAnythingSerializer(data=params)
        serializer.is_valid(raise_exception=True)

        results = find_anything(**serializer.validated_data)
        search_results = list(results.values())
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

        if self.action == "urls":
            return DataLayer.objects.filter(
                Q(dataset__visibility=VisibilityOptions.PUBLIC)
                | Q(dataset_id=settings.CLIMATE_FORESIGHT_DATASET_ID)
            )

        queryset = DataLayer.objects.filter(
            dataset__visibility=VisibilityOptions.PUBLIC,
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
