from core.serializers import MultiSerializerMixin
from datasets.filters import DataLayerFilterSet
from datasets.models import DataLayer, Dataset, VisibilityOptions
from datasets.serializers import (
    BrowseDataLayerSerializer,
    DataLayerSerializer,
    DatasetSerializer,
)
from django.contrib.postgres.search import SearchQuery, SearchVector
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.mixins import ListModelMixin
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet


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
        return Dataset.objects.filter(visibility=VisibilityOptions.PUBLIC)

    @action(detail=True, methods=["get"])
    def browse(self, request, pk=None):
        dataset = self.get_object()

        # TODO: specify a filter here to return only datalayers that are ready
        datalayers = dataset.datalayers.all()
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
        return queryset
