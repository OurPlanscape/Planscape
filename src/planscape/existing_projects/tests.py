from django.test import TestCase
from django.urls import reverse

class ITSTest(TestCase):
        
    def test_token_missing(self):
        response = self.client.get(
            reverse('existing_projects:its'), {}, content_type='application/json')
        self.assertEqual(response.status_code, 200)