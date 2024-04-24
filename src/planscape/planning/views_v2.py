import logging
from rest_framework import viewsets, filters
from django.contrib.auth.models import User
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from planning.models import PlanningArea
from planning.serializers import PlanningAreaSerializer, ListPlanningAreaSerializer
from planning.filters import PlanningAreaFilter
from planning.permission import PlanningUserPermission

logger = logging.getLogger(__name__)


class PlanningAreaViewSet(viewsets.ModelViewSet):
    queryset = PlanningArea.objects.all()
    serializer_class = PlanningAreaSerializer
    permission_classes = [IsAuthenticated, PlanningUserPermission]
    ordering_fields = ["name", "created_at"]
