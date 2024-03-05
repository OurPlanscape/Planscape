from django.urls import path
from collaboration.views import (
    CreateInvite,
    GetInvitationsForObject,
    UpdateCollaborationRole,
)

app_name = "collaboration"
urlpatterns = [
    path(
        "create_invite/",
        CreateInvite.as_view(),
        name="create_invite",
    ),
    path(
        "invitations/<ctype:target_entity>/<int:object_pk>",
        GetInvitationsForObject.as_view(),
        name="get_invitations",
    ),
    path(
        "update_invitation/<int:object_pk>",
        UpdateCollaborationRole.as_view(),
        name="update_invitation",
    ),
]
