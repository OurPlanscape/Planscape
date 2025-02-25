import json
import logging

from allauth.account.utils import has_verified_email
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import User
from django.http import HttpRequest, HttpResponse, HttpResponseBadRequest, JsonResponse
from django.utils.encoding import force_str
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from planscape.permissions import PlanscapePermission
from users.serializers import UserSerializer, MartinResourceSerializer

# Configure global logging.
logger = logging.getLogger(__name__)


@api_view(["GET", "POST"])
def get_user(request: HttpRequest) -> User:
    user = None
    if hasattr(request, "user") and request.user.is_authenticated:
        user = request.user
    return user


@api_view(["GET"])
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


@api_view(["POST"])
def delete_user(request: HttpRequest) -> HttpResponse:
    try:
        logged_in_user = request.user
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


def unset_jwt_cookies(response):
    try:
        cookie_name = settings.REST_AUTH["JWT_AUTH_COOKIE"]
        refresh_cookie_name = settings.REST_AUTH["JWT_AUTH_REFRESH_COOKIE"]
        refresh_cookie_path = settings.REST_AUTH["JWT_AUTH_REFRESH_COOKIE_PATH"]
        cookie_samesite = settings.REST_AUTH["JWT_AUTH_SAMESITE"]

        if cookie_name:
            response.delete_cookie(cookie_name, samesite=cookie_samesite)
        if refresh_cookie_name:
            response.delete_cookie(
                refresh_cookie_name, path=refresh_cookie_path, samesite=cookie_samesite
            )
    except KeyError as ke:
        logger.error(f"Could not read cookie settings: {ke}")
        raise


# There was no endpoint that allows us to deactivate the currently logged in user and also
# invalidate/blacklist their existing cookies, so this combines approaches for deactivation and
# adapts some code from dj-rest-auth to deal with the JWT auth and refresh tokens.
@api_view(["POST"])
def deactivate_user(request: Request) -> Response:
    logged_in_user = request.user
    if not logged_in_user.is_authenticated:
        return Response(
            {"error": "Authentication Required"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    body = json.loads(request.body)

    password = body.get("password", None)
    if not logged_in_user.check_password(password):
        return Response(
            {"error": "Credentials Incorrect"}, status=status.HTTP_403_FORBIDDEN
        )

    user_email_to_delete = body.get("email", None)
    if user_email_to_delete is None or user_email_to_delete != logged_in_user.email:
        return Response(
            {"error": "Email given is incorrect"}, status=status.HTTP_403_FORBIDDEN
        )

    # Update DB record
    logged_in_user.is_active = False
    logged_in_user.save()

    response = Response(
        {"detail": "Successfully logged out."},
        status=status.HTTP_200_OK,
    )
    # unset auth cookies
    unset_jwt_cookies(response)

    # we also need to blacklist the refresh token
    try:
        token = RefreshToken(request.data["my-refresh-token"])
        token.blacklist()
    except KeyError:
        response.data = {"detail": ("Refresh token removed.")}
        response.status_code = status.HTTP_200_OK
    except (TokenError, AttributeError, TypeError) as error:
        if hasattr(error, "args"):
            if (
                "Token is blacklisted" in error.args
                or "Token is invalid or expired" in error.args
            ):
                response.data = {"detail": (error.args[0])}
                response.status_code = status.HTTP_401_UNAUTHORIZED
            else:
                response.data = {"detail": "An error has occurred."}
                response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR

        else:
            response.data = {"detail": "An error has occurred."}
            response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    return response


@api_view(["GET"])
def is_verified_user(request: HttpRequest) -> HttpResponse:
    try:
        logged_in_user = request.user
        if logged_in_user is None:
            raise ValueError("Must be logged in")
        if not has_verified_email(logged_in_user):
            raise ValueError("Email not verified.")
        return JsonResponse({"verified": True})
    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))


@api_view(["POST", "GET"])
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


@api_view(["GET"])
@permission_classes([PlanscapePermission])
def validate_martin_request(request: Request) -> Response:
    original_uri = request.headers.get("X-Original-URI")
    if not original_uri:
        return Response(
            {"error": "X-Original-URI header not found"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if original_uri.find("?") == -1:
        return Response({"valid": True})

    original_query_params_str = original_uri.split("?")[1]
    original_query_params = dict(
        param.split("=") for param in original_query_params_str.split("&")
    )
    serializer = MartinResourceSerializer(
        data=original_query_params, context={"user": request.user}
    )

    serializer.is_valid(raise_exception=True)

    return Response({"valid": True})
