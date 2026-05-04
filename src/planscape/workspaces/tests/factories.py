import factory
from planscape.tests.factories import UserFactory

from datasets.models import VisibilityOptions
from workspaces.models import UserAccessWorkspace, Workspace, WorkspaceRole


class WorkspaceFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Workspace

    name = factory.Sequence(lambda x: f"Workspace {x}")
    visibility = VisibilityOptions.PRIVATE


class UserAccessWorkspaceFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = UserAccessWorkspace

    user = factory.SubFactory(UserFactory)
    workspace = factory.SubFactory(WorkspaceFactory)
    role = WorkspaceRole.VIEWER
