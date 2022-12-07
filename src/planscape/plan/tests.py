from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse

from .models import Plan


class PlanTest(TestCase):
    def setUp(self):
        self.user = User.objects.create(username='testuser')
        self.user.set_password('12345')
        self.user.save()

    def test_missing_user(self):
        response = self.client.post(
            reverse('plan:create'), {'name': 'plan'},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_missing_name(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('plan:create'), {},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_missing_geometry(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('plan:create'), {'name': 'plan'},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_missing_features(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('plan:create'), {'name': 'plan', 'geometry': {}},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_empty_features(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('plan:create'),
            {'name': 'plan', 'geometry': {'features': []}},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_bad_geometry(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('plan:create'),
            {'name': 'plan', 'geometry': {'features': [
                {'type': 'Point', 'coordinates': [1, 2]}]}},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_bad_polygon(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('plan:create'),
            {'name': 'plan', 'geometry': {'features': [
                {'geometry': {'type': 'Polygon'}}]}},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_good_polygon(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('plan:create'),
            {'name': 'plan', 'geometry': {'features': [
                {'geometry': {'type': 'Polygon', 'coordinates': [[[1, 2], [2, 3], [3, 4], [1, 2]]]}}]}},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(Plan.objects.all()), 1)

    def test_good_multipolygon(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('plan:create'),
            {'name': 'plan', 'geometry': {'features': [
                {'geometry': {'type': 'MultiPolygon', 'coordinates': [[[1, 2], [2, 3], [3, 4], [1, 2]]]}}]}},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(Plan.objects.all()), 1)

    def test_good_region_name(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('plan:create'),
            {'name': 'plan', 'region_name': 'north_coast_inland', 'geometry': {'features': [
                {'geometry': {'type': 'MultiPolygon', 'coordinates': [[[1, 2], [2, 3], [3, 4], [1, 2]]]}}]}},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(Plan.objects.all()), 1)
