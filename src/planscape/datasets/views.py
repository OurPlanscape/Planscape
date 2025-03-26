from typing import Any, Dict

from cacheops import cached
from core.serializers import MultiSerializerMixin
from django.conf import settings
from django.contrib.postgres.search import SearchQuery, SearchVector
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.mixins import ListModelMixin
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from datasets.filters import BrowseDataLayerFilterSet, DataLayerFilterSet
from datasets.models import DataLayer, DataLayerStatus, Dataset, VisibilityOptions
from datasets.serializers import (
    BrowseDataLayerFilterSerializer,
    BrowseDataLayerSerializer,
    DataLayerSerializer,
    DatasetSerializer,
    FindAnythingSerializer,
    SearchResultsSerializer,
)
from datasets.services import find_anything


class DatasetViewSet(ListModelMixin, MultiSerializerMixin, GenericViewSet):
    queryset = Dataset.objects.none()
    permission_classes = [IsAuthenticated]
    pagination_class = LimitOffsetPagination
    serializer_class = DatasetSerializer
    serializer_classes = {
        "list": DatasetSerializer,
    }

    def get_queryset(self):
        # TODO: afterwards we need to implement the filtering
        # by organization visibility too, so we return the public ones
        # PLUS all the datasets accessible by the organization
        return Dataset.objects.filter(
            visibility=VisibilityOptions.PUBLIC
        ).select_related(
            "organization",
            "created_by",
        )

    @extend_schema(
        description="Returns all datalayers inside this dataset",
        parameters=[BrowseDataLayerFilterSerializer],
        responses={
            200: BrowseDataLayerSerializer(many=True),
        },
    )
    @action(detail=True, methods=["get"])
    def browse(self, request, pk=None):
        data = self._get_browse_result(request.query_params)

        return Response(
            data,
            status=status.HTTP_200_OK,
        )

    @cached(timeout=settings.BROWSE_DATASETS_TTL)
    def _get_browse_result(self, query_params: Dict[str, Any]):
        dataset = self.get_object()
        datalayers = (
            dataset.datalayers.all()
            .select_related("organization", "dataset", "category")
            .prefetch_related("styles")
            .filter(status=DataLayerStatus.READY)
        )

        filterset = BrowseDataLayerFilterSet(queryset=datalayers, request=query_params)
        serializer = BrowseDataLayerSerializer(filterset.qs, many=True)

        return serializer.data


class DataLayerViewSet(ListModelMixin, MultiSerializerMixin, GenericViewSet):
    queryset = DataLayer.objects.none()
    permission_classes = [IsAuthenticated]
    pagination_class = LimitOffsetPagination
    serializer_class = DataLayerSerializer
    serializer_classes = {
        "list": DataLayerSerializer,
    }
    filterset_class = DataLayerFilterSet

    @extend_schema(
        parameters=[FindAnythingSerializer],
        responses={200: SearchResultsSerializer(many=True)},
    )
    @action(detail=False, methods=["get"])
    def find_anything(self, request):
        serializer = FindAnythingSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        # TODO: cache results and paginate here.
        term = serializer.validated_data.get("term")
        type = serializer.validated_data.get("type")
        results = find_anything(
            term=term,
            type=type,
        )
        page = self.paginate_queryset(results.values())  # type: ignore
        if page is not None:
            out_serializer = SearchResultsSerializer(
                page,
                many=True,
            )
            return self.get_paginated_response(serializer.data)
        out_serializer = SearchResultsSerializer(
            list(results.values()),
            many=True,
        )
        return Response(out_serializer.data, status=status.HTTP_200_OK)

    def get_queryset(self):
        # TODO: afterwards we need to implement the filtering
        # by organization visibility too, so we return the public ones
        # PLUS all the datalayers accessible by the organization

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
