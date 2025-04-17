from core.serializers import MultiSerializerMixin
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.mixins import CreateModelMixin, ListModelMixin, RetrieveModelMixin
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from datasets.filters import DataLayerFilterSet, StyleFilterSet
from datasets.models import DataLayer, Dataset, Style
from datasets.serializers import (
    AssociateDataLayerSerializer,
    AssociateStyleSerializer,
    ChangeDataLayerStatusSerializer,
    CreateDataLayerSerializer,
    CreateDatasetSerializer,
    CreateStyleSerializer,
    DataLayerCreatedSerializer,
    DataLayerHasStyleSerializer,
    DataLayerSerializer,
    DatasetSerializer,
    StyleCreatedSerializer,
    StyleSerializer,
)
from datasets.services import (
    assign_style,
    change_datalayer_status,
    create_datalayer,
    create_dataset,
    create_style,
)


class AdminDatasetViewSet(
    ListModelMixin,
    RetrieveModelMixin,
    MultiSerializerMixin,
    CreateModelMixin,
    GenericViewSet,
):
    queryset = Dataset.objects.all()
    permission_classes = [IsAdminUser]
    serializer_class = DatasetSerializer
    serializer_classes = {
        "list": DatasetSerializer,
        "create": CreateDatasetSerializer,
        "retrieve": DatasetSerializer,
    }
    pagination_class = LimitOffsetPagination

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dataset_created = create_dataset(**serializer.validated_data)
        out_serializer = DatasetSerializer(instance=dataset_created)
        headers = self.get_success_headers(serializer.data)
        return Response(
            out_serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )


class AdminDataLayerViewSet(
    ListModelMixin,
    RetrieveModelMixin,
    MultiSerializerMixin,
    CreateModelMixin,
    GenericViewSet,
):
    queryset = DataLayer.objects.all()
    permission_classes = [IsAdminUser]
    serializer_class = DataLayerSerializer
    serializer_classes = {
        "list": DataLayerSerializer,
        "create": CreateDataLayerSerializer,
        "retrieve": DataLayerSerializer,
    }
    pagination_class = LimitOffsetPagination
    filterset_class = DataLayerFilterSet

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        datalayer_created = create_datalayer(**serializer.validated_data)
        out_serializer = DataLayerCreatedSerializer(instance=datalayer_created)
        headers = self.get_success_headers(serializer.data)
        return Response(
            out_serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )

    @action(detail=True, methods=["post"])
    def apply_style(self, request, pk=None):
        datalayer = self.get_object()
        serializer = AssociateDataLayerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        my_style = serializer.validated_data.get("record")
        dlhstyle = assign_style(
            created_by=self.request.user,  # type: ignore
            style=my_style,
            datalayer=datalayer,
        )
        out_serializer = DataLayerHasStyleSerializer(
            instance={"datalayer": dlhstyle.datalayer, "style": dlhstyle.style}
        )
        return Response(
            data=out_serializer.data,
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=True, methods=["post"])
    def change_status(self, request, pk=None):
        datalayer = self.get_object()
        serializer = ChangeDataLayerStatusSerializer(
            data=request.data,
            context={"current_status": datalayer.status},
        )
        serializer.is_valid(raise_exception=True)

        target_status = serializer.validated_data.get("status")
        organization = serializer.validated_data.get("organnization")
        user = request.user

        try:
            datalayer = change_datalayer_status(
                organization,
                user,
                datalayer,
                target_status,
            )

            out_serializer = DataLayerSerializer(datalayer)
            return Response(out_serializer.data, status=status.HTTP_200_OK)
        except Exception:
            return Response(
                {
                    "message": f"Something went wrong changing status of {datalayer.pk}",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AdminStyleViewSet(
    ListModelMixin,
    RetrieveModelMixin,
    MultiSerializerMixin,
    CreateModelMixin,
    GenericViewSet,
):
    queryset = Style.objects.all()
    permission_classes = [IsAdminUser]
    serializer_class = StyleSerializer
    serializer_classes = {
        "list": StyleSerializer,
        "create": CreateStyleSerializer,
        "retrieve": StyleSerializer,
    }
    pagination_class = LimitOffsetPagination
    filterset_class = StyleFilterSet

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        style_created = create_style(**serializer.validated_data)
        out_serializer = StyleCreatedSerializer(instance=style_created)
        headers = self.get_success_headers(serializer.data)
        return Response(
            out_serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )

    @action(detail=True, methods=["post"])
    def apply_style(self, request, pk=None):
        my_style = self.get_object()
        serializer = AssociateStyleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        datalayer = serializer.validated_data.get("record")
        dlhstyle = assign_style(
            created_by=self.request.user,  # type: ignore
            style=my_style,
            datalayer=datalayer,
        )
        out_serializer = DataLayerHasStyleSerializer(
            instance={"datalayer": dlhstyle.datalayer, "style": dlhstyle.style}
        )
        return Response(
            data=out_serializer.data,
            status=status.HTTP_202_ACCEPTED,
        )
