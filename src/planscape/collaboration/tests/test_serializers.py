from rest_framework.test import APITestCase
from collaboration.serializers import CreateUserObjectRolesSerializer
from collaboration.models import Role


class TestCreateUserObjectRolesSerializer(APITestCase):
    def get_payload(self):
        return {
            "emails": ["test@example.com"],
            "role": Role.OWNER,
            "message": "Hello, World!",
            "object_pk": 1,
        }

    def test_valid_data(self):
        payload = self.get_payload()
        serializer = CreateUserObjectRolesSerializer(data=payload)
        self.assertTrue(serializer.is_valid())

    def test_invalid_email(self):
        payload = self.get_payload()
        payload["emails"] = ["invalid_email"]
        serializer = CreateUserObjectRolesSerializer(data=payload)
        self.assertFalse(serializer.is_valid())
        self.assertEqual(set(serializer.errors.keys()), set(["emails"]))

    def test_invalid_email_not_enough_emails(self):
        payload = self.get_payload()
        payload["emails"] = []
        serializer = CreateUserObjectRolesSerializer(data=payload)
        self.assertFalse(serializer.is_valid())
        self.assertEqual(set(serializer.errors.keys()), set(["emails"]))

    def test_invalid_role(self):
        payload = self.get_payload()
        payload["role"] = "invalid_role"
        serializer = CreateUserObjectRolesSerializer(data=payload)
        self.assertFalse(serializer.is_valid())
        self.assertEqual(set(serializer.errors.keys()), set(["role"]))

    def test_missing_email(self):
        payload = self.get_payload()
        del payload["emails"]
        serializer = CreateUserObjectRolesSerializer(data=payload)
        self.assertFalse(serializer.is_valid())
        self.assertEqual(set(serializer.errors.keys()), set(["emails"]))

    def test_missing_role(self):
        payload = self.get_payload()
        del payload["role"]
        serializer = CreateUserObjectRolesSerializer(data=payload)
        self.assertFalse(serializer.is_valid())
        self.assertEqual(set(serializer.errors.keys()), set(["role"]))

    def test_missing_message_not_required(self):
        payload = self.get_payload()
        del payload["message"]
        serializer = CreateUserObjectRolesSerializer(data=payload)
        self.assertTrue(serializer.is_valid())

    def test_missing_message_null(self):
        payload = self.get_payload()
        payload["message"] = None
        serializer = CreateUserObjectRolesSerializer(data=payload)
        self.assertTrue(serializer.is_valid())
