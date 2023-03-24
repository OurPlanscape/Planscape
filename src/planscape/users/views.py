import json

from django.contrib.auth.models import User
from django.http import (HttpRequest, HttpResponse, HttpResponseBadRequest,
                         JsonResponse)

def get_user(request: HttpRequest) -> User:
    user = None
    if hasattr(request, 'user') and request.user.is_authenticated:
        user = request.user
    return user

def delete_user(request: HttpRequest) -> HttpResponse:
    try:
        logged_in_user = get_user(request)
        if logged_in_user is None:
            raise ValueError("Must be logged in")
        body = json.loads(request.body)
        user_email_to_delete = body.get('email', None)
        if user_email_to_delete is None or not isinstance(user_email_to_delete, str):
            raise ValueError("User email must be provided as a string")
        if user_email_to_delete != logged_in_user.email:
            raise ValueError("Cannot delete another user account")

        # Deactivate user account
        logged_in_user.is_active = False
        logged_in_user.save()

        return JsonResponse({"deleted": True})
    except Exception as e:
        return HttpResponseBadRequest("Ill-formed request: " + str(e))
