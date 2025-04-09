from urllib.parse import urljoin

from allauth.account.adapter import DefaultAccountAdapter
from django.conf import settings

from users.services import identify_user_in_op


class CustomAllauthAdapter(DefaultAccountAdapter):
    def get_email_confirmation_url(self, request, emailconfirmation):
        referrer = request.META.get("HTTP_ORIGIN")
        confirmation_url = urljoin(referrer, f"validate/{emailconfirmation.key}")
        return confirmation_url

    def generate_unique_username(self, txts, regex=None):
        # txt is passed in as [first_name, last_name, email, username, "user"]
        # in the DefaultAccountAdapter provided by django-allauth.
        # Return the email part of `txts`.
        return txts[2]

    def save_user(self, request, user, form, commit=True):
        user = super().save_user(request, user, form, commit=commit)
        op = settings.op
        identify_user_in_op(op, user)
        return user
