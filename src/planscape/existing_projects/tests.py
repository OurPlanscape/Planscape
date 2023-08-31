from unittest.mock import patch
from django.test import TestCase
from django.urls import reverse
from requests.models import Response


class ITSTest(TestCase):
    def test_token_missing(self):
        response = Response()
        response.code = 200
        response._content = b'{ "key" : "a" }'
        with patch(
            "existing_projects.views.requests.get", return_value=response
        ) as get:
            response = self.client.get(
                reverse("existing_projects:its"), {}, content_type="application/json"
            )

            self.assertEqual(response.status_code, 200)
