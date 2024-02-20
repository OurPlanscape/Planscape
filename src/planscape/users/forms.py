from allauth.account.adapter import get_adapter
from allauth.account.forms import default_token_generator
from allauth.account import app_settings
from allauth.account.utils import user_pk_to_url_str

from django.conf import settings
from django.contrib.sites.shortcuts import get_current_site

from dj_rest_auth.forms import AllAuthPasswordResetForm


class CustomAllAuthPasswordResetForm(AllAuthPasswordResetForm):
    def send_unknown_account_mail(self, request, email):
        referrer = request.META.get("HTTP_ORIGIN")
        create_url = f"{referrer}/signup"

        context = {
            "current_site": referrer,
            "request": request,
            "create_account_url": create_url,
            "given_email": email,
        }
        get_adapter(request).send_mail(
            "account/email/unknown_user_reset", email, context
        )

    def save(self, request, **kwargs):
        """Adapted from dj_rest_auth's own password reset form, but with URL
        configuration set via Django's configuration.

        """

        referrer = request.META.get("HTTP_ORIGIN")
        token_generator = kwargs.get("token_generator", default_token_generator)
        email = self.cleaned_data["email"]

        # if we don't locate an email record for this user, we still send an email
        # letting the user know that someone is trying to reset a password for this account
        if not self.users and settings.EMAIL_UNKNOWN_ACCOUNTS:
            self.send_unknown_account_mail(request, email)

        for user in self.users:
            token = token_generator.make_token(user)
            user_id = user_pk_to_url_str(user)
            url = f"{referrer}/reset/{user_id}/{token}"
            # We don't specify a username because authentication is based
            # on email.
            context = {
                # TODO: Change the template since the default template expects
                # a Site object.
                "current_site": referrer,
                "user": user,
                "password_reset_url": url,
                "request": request,
            }
            get_adapter(request).send_mail(
                "account/email/password_reset_key", email, context
            )
        return self.cleaned_data["email"]
