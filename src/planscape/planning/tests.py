import datetime
import json

from base.condition_types import ConditionLevel, ConditionScoreType
from conditions.models import BaseCondition, Condition, ConditionRaster
from django.contrib.auth.models import User
from django.contrib.gis.geos import GEOSGeometry, MultiPolygon, Polygon
from django.db import connection
from django.test import TransactionTestCase
from django.urls import reverse
from planscape import settings

from .models import (PlanningArea, Scenario)


# Create test plans.  These are going straight to the test DB without
# normal parameter checking (e.g. if is there a real geometry).
# Always use a Sierra Nevada region.
def _create_plan(
        user: User | None, name: str, geometry: GEOSGeometry | None):
    """
    Creates a plan with the given user, name, geometry.  All regions
    are in Sierra Nevada.
    """
    plan = PlanningArea.objects.create(
        user=user, name=name, region_name='sierra_cascade_inyo',
        geometry=geometry)
    plan.save()
    return plan

#### PLAN(NING AREA) Tests ####
        
class CreatePlanningAreaTest(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create(username='testuser')
        self.user.set_password('12345')
        self.user.save()
        self.geometry = {'features': [
                {'geometry': {'type': 'Polygon', 'coordinates': [[[1, 2], [2, 3], [3, 4], [1, 2]]]}}]}

    def test_missing_user(self):
        response = self.client.post(
            reverse('planning:create_plan'), {'name': 'plan', 'region_name': 'Sierra Nevada', 'geometry': self.geometry},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_missing_name(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('planning:create_plan'), {'region_name': 'Sierra Nevada', 'geometry': self.geometry},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_missing_geometry(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('planning:create_plan'), {'name': 'plan', 'region_name': 'Sierra Nevada'},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_missing_features(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('planning:create_plan'), {'name': 'plan', 'region_name': 'Sierra Nevada', 'geometry': {}},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_empty_features(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('planning:create_plan'),
            {'name': 'plan', 'region_name': 'Sierra Nevada', 'geometry': {'features': []}},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_bad_geometry(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('planning:create_plan'),
            {'name': 'plan', 'region_name': 'Sierra Nevada', 'geometry': {'features': [
                {'type': 'Point', 'coordinates': [1, 2]}]}},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_bad_polygon(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('planning:create_plan'),
            {'name': 'plan', 'region_name': 'Sierra Nevada', 'geometry': {'features': [
                {'geometry': {'type': 'Polygon'}}]}},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_good_polygon(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('planning:create_plan'),
            {'name': 'test plan', 'region_name': 'Sierra Nevada', 'geometry': self.geometry},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(PlanningArea.objects.count(), 1)

    def test_good_multipolygon(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('planning:create_plan'),
            {'name': 'plan', 'region_name': 'Sierra Nevada', 'geometry': {'features': [
                {'geometry': {'type': 'MultiPolygon', 'coordinates': [[[[1, 2], [2, 3], [3, 4], [1, 2]]]]}}]}},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(PlanningArea.objects.count(), 1)

    def test_bad_region_name(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('planning:create_plan'),
            {'name': 'plan', 'region_name': 'north_coast_inland', 'geometry': {'features': [
                {'geometry': {'type': 'MultiPolygon', 'coordinates': [[[[1, 2], [2, 3], [3, 4], [1, 2]]]]}}]}},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_good_region_name(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('planning:create_plan'),
            {'name': 'plan', 'region_name': 'Sierra Nevada', 'geometry': {'features': [
                {'geometry': {'type': 'MultiPolygon', 'coordinates': [[[[1, 2], [2, 3], [3, 4], [1, 2]]]]}}]}},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        plans = PlanningArea.objects.all()
        self.assertEqual(plans.count(), 1)
        plan = plans.first()
        assert plan is not None
        self.assertEqual(plan.region_name, 'sierra_cascade_inyo')


class DeletePlanningAreaTest(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create(username='testuser')
        self.user.set_password('12345')
        self.user.save()

        self.plan1 = _create_plan(self.user, "plan1", None)
        self.plan2 = _create_plan(self.user, "plan2", None)

        self.user2 = User.objects.create(username='testuser2')
        self.user2.set_password('12345')
        self.user2.save()

        self.plan3 = _create_plan(self.user2, "plan3", None)
        
    def test_delete_user_not_logged_in(self):
        response = self.client.post(
            reverse('planning:delete_plan'), {'id': self.plan1.pk},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(PlanningArea.objects.count(), 3)

    def test_delete_wrong_user(self):
        self.client.force_login(self.user)

        response = self.client.post(
            reverse('planning:delete_plan'), {'id': self.plan3.pk},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(PlanningArea.objects.count(), 3)

    def test_delete(self):
        self.client.force_login(self.user)
        self.assertEqual(PlanningArea.objects.count(), 3)
        response = self.client.post(
            reverse('planning:delete_plan'), {'id': self.plan2.pk},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, json.dumps(
            {"id": [self.plan2.pk]}).encode())
        self.assertEqual(PlanningArea.objects.count(), 2)

    def test_delete_multiple_plans_fails_if_owner_mismatch(self):
        self.client.force_login(self.user)
        self.assertEqual(PlanningArea.objects.count(), 3)
        plan_ids = [self.plan1.pk, self.plan3.pk]
        response = self.client.post(
            reverse('planning:delete_plan'), {'id': plan_ids},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(PlanningArea.objects.count(), 3)

    def test_delete_multiple_plans(self):
        self.client.force_login(self.user)
        self.assertEqual(PlanningArea.objects.count(), 3)
        plan_ids = [self.plan1.pk, self.plan2.pk]
        response = self.client.post(
            reverse('planning:delete_plan'), {'id': plan_ids},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, json.dumps(
            {"id": plan_ids}).encode())
        self.assertEqual(PlanningArea.objects.count(), 1)


class GetPlanningAreaTest(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create(username='testuser')
        self.user.set_password('12345')
        self.user.save()
        self.geometry = {'type': 'MultiPolygon',
                         'coordinates': [[[[1, 2], [2, 3], [3, 4], [1, 2]]]]}
        storable_geometry = GEOSGeometry(json.dumps(self.geometry))
        self.plan = _create_plan(self.user, 'test plan', storable_geometry)

        self.user2 = User.objects.create(username='testuser2')
        self.user2.set_password('12345')
        self.user2.save()
        self.plan2 = _create_plan(self.user2, 'test plan2', storable_geometry)

    def test_get_plan(self):
        self.client.force_login(self.user)
        response = self.client.get(
            reverse('planning:get_plan_by_id'),
            {'id': self.plan.pk},
            content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['name'], 'test plan')
        self.assertEqual(response.json()['region_name'], 'Sierra Nevada')

    def test_get_nonexistent_plan(self):
        self.client.force_login(self.user)
        response = self.client.get(reverse('planning:get_plan_by_id'), {'id': 9999},
                                   content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_get_plan_does_not_belong_to_user(self):
        self.client.force_login(self.user)
        response = self.client.get(
            reverse('planning:get_plan_by_id'),
            {'id': self.plan2.pk},
            content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_get_plan_not_logged_in(self):
        response = self.client.get(
            reverse('planning:get_plan_by_id'),
            {'id': self.plan.pk},
            content_type="application/json")
        self.assertEqual(response.status_code, 400)


class ListPlanningAreaTest(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create(username='testuser')
        self.user.set_password('12345')
        self.user.save()
        self.geometry = {'type': 'MultiPolygon',
                         'coordinates': [[[[1, 2], [2, 3], [3, 4], [1, 2]]]]}
        stored_geometry = GEOSGeometry(json.dumps(self.geometry))
        self.plan1 = _create_plan(self.user, 'plan1', stored_geometry)
        self.plan2 = _create_plan(self.user, 'plan2', stored_geometry)

        self.user2 = User.objects.create(username='testuser2')
        self.user2.set_password('12345')
        self.user2.save()
        self.geometry = {'type': 'MultiPolygon',
                         'coordinates': [[[[1, 2], [2, 3], [3, 4], [1, 2]]]]}
        stored_geometry = GEOSGeometry(json.dumps(self.geometry))
        self.plan3 = _create_plan(self.user2, 'plan3', stored_geometry)

        self.emptyuser = User.objects.create(username='emptyuser')
        self.emptyuser.set_password('12345')
        self.emptyuser.save()
        
    def test_list_plans_not_logged_in(self):
        response = self.client.get(reverse('planning:list_plans'), {},
                                   content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_list_plans_user_logged_in(self):
        self.client.force_login(self.user)
        response = self.client.get(
            reverse('planning:list_plans'),
            {},
            content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 2)

    def test_list_plans_empty_user(self):
        self.client.force_login(self.emptyuser)
        response = self.client.get(
            reverse('planning:list_plans'),
            {},
            content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 0)


# EndtoEnd test that lists, creates a plan, tests what was stored,
# and then deletes it.
# This covers the basic happiest of cases and should not be a substitute
# for the main unit tests.
class EndtoEndPlanningAreaTest(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create(username='testuser')
        self.user.set_password('12345')
        self.user.save()
        self.internal_geometry = {'type': 'MultiPolygon',
                         'coordinates': [[[[1, 2], [2, 3], [3, 4], [1, 2]]]]}
        self.geometry = {'features': [{'geometry': self.internal_geometry}]}

    def test_end_to_end(self):
        self.client.force_login(self.user)

        # List - returns 0
        response = self.client.get(
            reverse('planning:list_plans'),
            {},
            content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 0)

        # insert one
        response = self.client.post(
            reverse('planning:create_plan'),
            {'name': 'test plan', 'region_name': 'Sierra Nevada', 'geometry': self.geometry},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(PlanningArea.objects.count(), 1)

        # is it there?
        response = self.client.get(
            reverse('planning:list_plans'),
            {},
            content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        plans = response.json()
        listed_plan = plans[0]
        
        # get plan details
        response = self.client.get(
            reverse('planning:get_plan_by_id'),
            {'id': listed_plan['id']},
            content_type="application/json")
        self.assertEqual(response.status_code, 200)
        plan = response.json()
        self.assertEqual(plan['name'], 'test plan')
        self.assertEqual(plan['region_name'], 'Sierra Nevada')
        self.assertEqual(plan['id'], listed_plan['id'])
        self.assertEqual(plan['geometry'], self.internal_geometry)

        # remove it
        response = self.client.post(
            reverse('planning:delete_plan'),
            {'id': plan['id']},
            content_type="application/json")
        self.assertEqual(response.status_code, 200)
        
        # there should be no more plans
        response = self.client.get(
            reverse('planning:list_plans'),
            {},
            content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 0)
