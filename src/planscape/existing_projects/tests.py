from unittest.mock import patch
from django.test import TestCase
from django.urls import reverse
from requests.models import Response
from django.test.client import Client as HttpClient

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
            self.assertRegex(str(response.content), r'key')
            self.assertNotRegex(str(response.content), r'Coming soon')

    def test_wrong_ip(self):
        response = Response()
        response.code = 200
        response._content = b'{ "key" : "a" }'
        with patch(
            "existing_projects.views.requests.get", return_value=response
        ) as get:
            response = self.client.get(
                '/planscape-backend/projects/its/', {}, **{'content_type':"application/json", 'REMOTE_ADDR':'192.168.0.1'}
            )
            self.assertEqual(response.status_code, 200)
            self.assertRegex(str(response.content), r'Coming soon')
            self.assertNotRegex(str(response.content), r'key')

