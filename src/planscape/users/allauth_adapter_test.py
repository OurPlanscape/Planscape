from django.test import TestCase

from users.allauth_adapter import CustomAllauthAdapter

class CustomAllauthAdapterTest(TestCase):
    def test_email_as_username(self):
        adapter = CustomAllauthAdapter()
        actual = adapter.generate_unique_username([
            "first_name",
            "last_name",
            "email",
            "username", 
            "user"
        ])
        self.assertEqual(actual, "email")