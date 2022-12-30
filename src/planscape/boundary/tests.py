from django.test import TestCase
from django.urls import reverse

from .models import Boundary, BoundaryDetails


class BoundaryTest(TestCase):
    def setUp(self):
        self.user = User.objects.create(username='testuser')
        self.user.set_password('12345')
        self.user.save()