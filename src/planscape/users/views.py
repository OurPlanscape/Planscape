import json

from django.contrib.auth.models import User
from django.http import (HttpRequest, HttpResponse, HttpResponseBadRequest,
                         JsonResponse)
from users.serializers import UserSerializer

def get_user(request: HttpRequest) -> User:
    user = None
    if hasattr(request, 'user') and request.user.is_authenticated:
        user = request.user
    return user

def get_user_by_id(request: HttpRequest) -> HttpResponse:
    try:
        assert isinstance(request.GET['id'], str)
        user_id = request.GET.get('id', "0")
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
        user_email_to_delete = body.get('email', None)
        password = body.get('password', None)
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
