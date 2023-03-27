from django.contrib.auth.models import User
from django.test import TransactionTestCase
from django.urls import reverse

# Create your tests here.

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
    
    def test_different_user(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('users:delete'), {'email': 'diffuser@test.com'},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)
    
    def test_same_user(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('users:delete'), {'email': 'testuser@test.com'},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(User.objects.get(pk=self.user.pk).is_active)
