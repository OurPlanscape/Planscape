from django.urls import path, register_converter
from collaboration.views import (
    CreateInvite,
    GetInvitationsForObject,
)
from planscape.url_converters import ContentTypeURLConverter

register_converter(ContentTypeURLConverter, "ctype")

app_name = "collaboration"
urlpatterns = [
    path(
        "create_invite/",
        CreateInvite.as_view(),
        name="create_invite",
    ),
    path(
        "invitations/<ctype:target_entity>/<int:object_pk>",
        GetInvitationsForObject,
        name="get_invitations",
    ),
]
