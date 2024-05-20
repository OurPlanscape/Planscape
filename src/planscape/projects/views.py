from rest_framework.mixins import ListModelMixin, RetrieveModelMixin
from rest_framework.viewsets import GenericViewSet

from projects.filters import ProjectFilterSet
from projects.models import Project, ProjectVisibility
from projects.serializers import ProjectSerializer


class ProjectViewSet(ListModelMixin, RetrieveModelMixin, GenericViewSet):
    queryset = Project.objects.filter(visibility=ProjectVisibility.PUBLIC)
    ordering_fields = ["name", "display_name", "created_at"]
    filterset_class = ProjectFilterSet
    serializer_class = ProjectSerializer
    lookup_field = "uuid"

    def get_queryset(self):
        # TODO: we need to customize
        # this later. This should return
        # all the projects the user has access to + the ones that are public
        return super().get_queryset()
