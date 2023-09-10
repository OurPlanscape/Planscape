from django.contrib.auth.models import User
from django.core import mail
from django.test import TransactionTestCase
from django.urls import reverse

# Create your tests here.

class CreateUserTest(TransactionTestCase):
    def test_create_user_username_is_email(self):
        print("Create user test case")
        response = self.client.post(
            reverse('rest_register'), {
                                         "email": "testuser@test.com",
                                         "password1": "ComplexPassword123",
                                         "password2": "ComplexPassword123",
                                         "first_name": "FirstName",
                                         "last_name": "LastName"
                                     })
        self.assertEquals(response.status_code, 201)

        user = User.objects.get(email='testuser@test.com')
        self.assertEquals(user.get_username(), "testuser@test.com")

        # Verification email is sent.
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject,
                         "[Planscape] Please Confirm Your E-mail Address")


class DeleteUserTest(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create(email='testuser@test.com')
        self.user.set_password('12345')
        self.user.save()
    
    def test_missing_user(self):
        response = self.client.post(
            reverse('users:delete'), {'email': 'testuser@test.com'},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)
    
    def test_missing_email(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('users:delete'), {},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_missing_password(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('users:delete'), {'email': 'testuser@test.com'},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)
    
    def test_different_user(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('users:delete'), {'email': 'diffuser@test.com'},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)
    
    def test_same_user(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('users:delete'), {'email': 'testuser@test.com', 'password': '12345'},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(User.objects.get(pk=self.user.pk).is_active)
