from django.urls import path
from collaboration.views import (
    CreateInvite,
    GetInvitationsForObject,
    InviteDetail,
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
        "invitations/<int:pk>",
        InviteDetail.as_view(),
        name="detail_invitation",
    ),
]
