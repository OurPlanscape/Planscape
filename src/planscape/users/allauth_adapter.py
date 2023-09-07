from urllib.parse import urljoin

from allauth.account.adapter import DefaultAccountAdapter


class CustomAllauthAdapter(DefaultAccountAdapter):
    def get_email_confirmation_url(self, request, emailconfirmation):
        referrer = request.META.get('HTTP_REFERER')
        confirmation_url = urljoin(referrer, f"validate/{emailconfirmation.key}")
        return confirmation_url