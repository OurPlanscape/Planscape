import json

from allauth.account.utils import has_verified_email
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import User
from django.http import HttpRequest, HttpResponse, HttpResponseBadRequest, JsonResponse
from django.utils.encoding import force_str
from dj_rest_auth.views import UserDetailsView
from users.serializers import UserSerializer


def get_user(request: HttpRequest) -> User:
    user = None
    if hasattr(request, "user") and request.user.is_authenticated:
        user = request.user
    return user


def get_user_by_id(request: HttpRequest) -> HttpResponse:
    try:
        assert isinstance(request.GET["id"], str)
        user_id = request.GET.get("id", "0")
        if user_id is None:
            raise ValueError("Must specify user_id")
        user = User.objects.get(id=user_id)
        return JsonResponse(UserSerializer(user).data, safe=False)
    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))


def delete_user(request: HttpRequest) -> HttpResponse:
    try:
        logged_in_user = get_user(request)
        if logged_in_user is None:
            raise ValueError("Must be logged in")
        body = json.loads(request.body)
        user_email_to_delete = body.get("email", None)
        password = body.get("password", None)
        if user_email_to_delete is None or not isinstance(user_email_to_delete, str):
            raise ValueError("User email must be provided as a string")
        if not logged_in_user.check_password(password):
            raise ValueError("Invalid password")
        if user_email_to_delete != logged_in_user.email:
            raise ValueError("Cannot delete another user account")

        # Deactivate user account
        logged_in_user.is_active = False
        logged_in_user.save()

        return JsonResponse({"deleted": True})
    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))


def update_name(request: HttpRequest) -> HttpResponse:
    try:
        logged_in_user = get_user(request)
        if logged_in_user is None:
            raise ValueError("Must be logged in")
        body = json.loads(request.body)

        print(body)
        user_email_to_delete = body.get("email", None)
        password = body.get("password", None)
        if user_email_to_delete is None or not isinstance(user_email_to_delete, str):
            raise ValueError("User email must be provided as a string")
        if not logged_in_user.check_password(password):
            raise ValueError("Invalid password")
        if user_email_to_delete != logged_in_user.email:
            raise ValueError("Cannot delete another user account")

        # Deactivate user account
        logged_in_user.is_active = False
        logged_in_user.save()

        return JsonResponse({"deleted": True})
    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))


def is_verified_user(request: HttpRequest) -> HttpResponse:
    try:
        logged_in_user = get_user(request)
        if logged_in_user is None:
            raise ValueError("Must be logged in")
        if not has_verified_email(logged_in_user):
            raise ValueError("Email not verified.")
        return JsonResponse({"verified": True})
    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))


def verify_password_reset_token(
    request: HttpRequest, user_id: str, token: str
) -> HttpResponse:
    # Get the UserModel
    UserModel = get_user_model()

    # dj-rest-auth supports both allauth and non-allauth methods of generating
    # password reset tokens. In order to mirror the validation done on the token
    # we also handle both methods.
    # https://github.com/iMerica/dj-rest-auth/blob/master/dj_rest_auth/serializers.py#L276-L291
    if "allauth" in settings.INSTALLED_APPS:
        from allauth.account.forms import default_token_generator
        from allauth.account.utils import url_str_to_user_pk as uid_decoder
    else:
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_decode as uid_decoder

    # Decode the uidb64 (allauth use base36) to uid to get User object
    try:
        uid = force_str(uid_decoder(user_id))
        user = UserModel._default_manager.get(pk=uid)
    except (TypeError, ValueError, OverflowError, UserModel.DoesNotExist):
        return HttpResponseBadRequest("Invalid url.")

    if not default_token_generator.check_token(user, token):
        return HttpResponseBadRequest("Invalid token.")

    return JsonResponse({"valid": True})


# This class exists only to override the PATCH call in dj-rest-auth's UserDetailsView
class CustomUserDetailsView(UserDetailsView):
    # require a password validation in addition to checking that the user is logged in
    # then proceeds with calling the existing method
    def patch(self, request, *args, **kwargs):
        try:
            logged_in_user = get_user(request)
            body = json.loads(request.body)
            current_password = body.get("current_password", None)
            if logged_in_user is None:
                return HttpResponseBadRequest("User is not logged in.", status=401)
            if not logged_in_user.check_password(current_password):
                return HttpResponseBadRequest(
                    "The password was not correct.", status=403
                )
            return super().patch(request, *args, **kwargs)

        except Exception as e:
            return HttpResponseBadRequest("Ill-formed request: " + str(e))
