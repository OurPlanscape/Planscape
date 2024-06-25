from allauth.account.adapter import get_adapter
from allauth.account.forms import default_token_generator
from allauth.account import app_settings
from allauth.account.utils import user_pk_to_url_str

from django.conf import settings
from django.contrib.sites.shortcuts import get_current_site

from dj_rest_auth.forms import AllAuthPasswordResetForm
from allauth.account.utils import filter_users_by_email

class CustomAllAuthPasswordResetForm(AllAuthPasswordResetForm):

    def clean_email(self):
        """
        Invalid email should not raise error, as this would leak users
        for unit test: test_password_reset_with_invalid_email
        """
        email = self.cleaned_data["email"]
        email = get_adapter().clean_email(email)
        self.users = filter_users_by_email(email) # remove the is_active test
        return self.cleaned_data["email"]


    def _send_unknown_account_mail(self, request, email):
        referrer = request.META.get("HTTP_ORIGIN")
        signup_url = f"{referrer}/signup"
        context = {
            "current_site": referrer,
            "request": request,
            "signup_url": signup_url,
            "given_email": email,
        }
        get_adapter(request).send_mail("account/email/unknown_account", email, context)

    def save(self, request, **kwargs):
        """Adapted from dj_rest_auth's own password reset form, but with URL
        configuration set via Django's configuration.

        """

        referrer = request.META.get("HTTP_ORIGIN")
        token_generator = kwargs.get("token_generator", default_token_generator)
        email = self.cleaned_data["email"]

        print(f"So...what are self.users?? {self.users}")


        # if we don't locate an email record, we still send an email
        # letting the user know that someone is trying to reset a password for this account
        if not self.users and settings.EMAIL_UNKNOWN_ACCOUNTS:
            self._send_unknown_account_mail(request, email)

        for user in self.users:
            print(f"The user: {user.is_active}")
            if user.is_active == False:
                print("This user is deactivated....")

            token = token_generator.make_token(user)
            user_id = user_pk_to_url_str(user)
            url = f"{referrer}/reset/{user_id}/{token}"
            # We don't specify a username because authentication is based
            # on email.
            context = {
                "current_site": referrer,
                "user": user,
                "password_reset_url": url,
                "request": request,
            }
            get_adapter(request).send_mail(
                "account/email/password_reset_key", email, context
            )
        return self.cleaned_data["email"]
