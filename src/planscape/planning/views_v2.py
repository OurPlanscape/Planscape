import logging
from django.db.models import Q
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth.models import User

from rest_framework import status, viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from planning.models import PlanningArea
from planning.serializers import PlanningAreaSerializer, ListPlanningAreaSerializer
from planning.filters import PlanningAreaFilter
from planning.permission import PlanningUserPermission
from collaboration.models import UserObjectRole

logger = logging.getLogger(__name__)


class PlanningAreaViewSet(viewsets.ModelViewSet):
    queryset = PlanningArea.objects.all()
    permission_classes = [PlanningUserPermission]
    ordering_fields = ["name", "created_at", "scenario_count"]
    filterset_class = PlanningAreaFilter

    def get_serializer_class(self):
        if self.action == "list":
            return ListPlanningAreaSerializer
        return PlanningAreaSerializer

    def get_queryset(self):
        user = self.request.user
        content_type_pk = ContentType.objects.get(model="planningarea").pk
        qs = super().get_queryset()
        # TODO: there has to be a better way to do this...
        qs = qs.filter(
            Q(user=user)
            | Q(
                pk__in=UserObjectRole.objects.filter(
                    collaborator_id=user, content_type_id=content_type_pk
                ).values_list("object_pk", flat=True)
            )
        )
        return qs
