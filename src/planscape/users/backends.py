from allauth.account.auth_backends import AuthenticationBackend

from planscape.openpanel import identify_openpanel, track_openpanel


class PlanscapeAuthBackend(AuthenticationBackend):
    def authenticate(self, request, **credentials):
        user = super().authenticate(request, **credentials)
        if user:
            identify_openpanel(user)  # type: ignore
            track_openpanel(
                "users.logged_in",
                user_id=user.pk,
            )
        return user
