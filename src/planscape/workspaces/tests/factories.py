import factory
from planscape.tests.factories import UserFactory

from datasets.models import VisibilityOptions
from workspaces.models import UserAccessWorkspace, Workspace, WorkspaceRole


class WorkspaceFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Workspace

    name = factory.Sequence(lambda x: f"Workspace {x}")
    visibility = VisibilityOptions.PRIVATE


    @factory.post_generation
    def owner(self, create, extracted, **kwargs):
        if not create or not extracted:
            return
        UserAccessWorkspaceFactory.create(user=extracted, workspace=self, role=WorkspaceRole.OWNER)
        return extracted

    @factory.post_generation
    def collaborators(self, create, extracted, **kwargs):
        if not create or not extracted:
            return
        for collaborator in extracted:
            UserAccessWorkspaceFactory.create(user=collaborator, workspace=self, role=WorkspaceRole.COLLABORATOR)
        return extracted

    @factory.post_generation
    def viewers(self, create, extracted, **kwargs):
        if not create or not extracted:
            return
        for viewer in extracted:
            UserAccessWorkspaceFactory.create(user=viewer, workspace=self, role=WorkspaceRole.VIEWER)
        return extracted
    

class UserAccessWorkspaceFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = UserAccessWorkspace

    user = factory.SubFactory(UserFactory)
    workspace = factory.SubFactory(WorkspaceFactory)
    role = WorkspaceRole.VIEWER
