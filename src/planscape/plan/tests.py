from django.contrib.auth.models import User
from django.test import TransactionTestCase
from django.urls import reverse

from .models import Plan


class PlanTest(TransactionTestCase):
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


class GetPlanTest(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create(username='testuser')
        self.user.set_password('12345')
        self.user.save()
        self.plan_no_user = Plan.objects.create(
            owner=None, name='ownerless', region_name='sierra_cascade_inyo')
        self.plan_with_user = Plan.objects.create(
            owner=self.user, name='with_owner', region_name='sierra_cascade_inyo')
        self.plan_with_user.save()

    def test_get_plan_with_user(self):
        response = self.client.get(reverse('plan:get_plan'), {'id': self.plan_with_user.pk},
                                   content_type="application/json")
        print(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get('name'), 'with_owner')
