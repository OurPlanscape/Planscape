from core.serializers import MultiSerializerMixin
from django.contrib.postgres.search import SearchQuery, SearchVector
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.mixins import ListModelMixin
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from datasets.filters import DataLayerFilterSet
from datasets.models import DataLayer, Dataset, VisibilityOptions
from datasets.serializers import (
    BrowseDataLayerSerializer,
    DataLayerSerializer,
    DatasetSerializer,
    FindAnythingSerializer,
    SearchResultSerialzier,
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
        responses={
            200: BrowseDataLayerSerializer(many=True),
        },
    )
    @action(detail=True, methods=["get"])
    def browse(self, request, pk=None):
        dataset = self.get_object()

        # TODO: specify a filter here to return only datalayers that are ready
        datalayers = (
            dataset.datalayers.all()
            .select_related("organization", "dataset", "category")
            .prefetch_related("styles")
        )
        serializer = BrowseDataLayerSerializer(datalayers, many=True)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )


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
        responses={200: SearchResultSerialzier(many=True)},
    )
    @action(detail=False, methods=["get"])
    def find_anything(self, request):
        serializer = FindAnythingSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        # TODO: cache results and paginate here.
        results = find_anything(serializer.validated_data.get("term"))
        out_serializer = SearchResultSerialzier(
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
