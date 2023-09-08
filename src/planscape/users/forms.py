from allauth.account.adapter import get_adapter
from allauth.account.forms import default_token_generator
from allauth.account import app_settings
from allauth.account.utils import user_pk_to_url_str

from django.conf import settings
from django.contrib.sites.shortcuts import get_current_site

from dj_rest_auth.forms import AllAuthPasswordResetForm


class CustomAllAuthPasswordResetForm(AllAuthPasswordResetForm):

    def save(self, request, **kwargs):
        """Adapted from dj_rest_auth's own password reset form, but with URL
        configuration set via Django's configuration.

        """
        domain = settings.PASSWORD_RESET_DOMAIN
        # TODO: current_site is expected by the default template. We should not
        # need a Site object for our custom template.
        current_site = get_current_site(request)
        token_generator = kwargs.get('token_generator', default_token_generator)
        email = self.cleaned_data['email']
        for user in self.users:
            token = token_generator.make_token(user)
            user_id = user_pk_to_url_str(user)
            url = "{proto}://{domain}/reset/{uid}/{token}".format(
                # Assume that the other service's http protocol is consistent
                # with this one.
                proto=app_settings.DEFAULT_HTTP_PROTOCOL,
                domain=domain,
                uid=user_id,
                token=token,
            )
            # We don't specify a username because authentication is based
            # on email.
            context = {
                "current_site": current_site,
                "user": user,
                "password_reset_url": url,
                "request": request,
            }
            get_adapter(request).send_mail(
                'account/email/password_reset_key', email, context
            )
        return self.cleaned_data['email']
