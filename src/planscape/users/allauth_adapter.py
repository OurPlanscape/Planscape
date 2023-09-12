from urllib.parse import urljoin

from allauth.account.adapter import DefaultAccountAdapter


class CustomAllauthAdapter(DefaultAccountAdapter):
    def get_email_confirmation_url(self, request, emailconfirmation):
        referrer = request.META.get('HTTP_ORIGIN')
        confirmation_url = urljoin(referrer, f"validate/{emailconfirmation.key}")
        return confirmation_url

    def generate_unique_username(self, txts, regex=None):
        # txt is passed in as [first_name, last_name, email, username, "user"]
        # in the DefaultAccountAdapter provided by django-allauth.
        # Return the email part of `txts`.
        return txts[2]