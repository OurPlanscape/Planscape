from django.test import TestCase
from django.urls import reverse
import json

class ITSTest(TestCase):
        
    def test_x(self):
        response = self.client.get(
            reverse('existing_projects:its'), {}, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.json())["error"]["code"], 499)
        self.assertEqual(json.loads(response.json())["error"]["message"], "Token Required")