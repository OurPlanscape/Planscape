from django.test import TestCase
from django.urls import reverse

class ITSTest(TestCase):
        
    def test_token_missing(self):
        response = self.client.get(
            reverse('existing_projects:its'), {}, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        # TODO: restore the response json parse statements removed in commit, https://github.com/OurPlanscape/Planscape/pull/630/commits/605c1d036a8a09916f7fe2dd3448acd90f25218e.