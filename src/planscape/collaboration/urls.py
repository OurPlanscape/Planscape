from django.urls import path
from collaboration.views import (
    CreateInvite,
    InvitationDetail,
    InvitationsForObject,
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
        InvitationsForObject.as_view(),
        name="get_invitations",
    ),
    path(
        "invitations/<int:invitation_id>",
        InvitationDetail.as_view(),
        name="update_invitation",
    ),
]
