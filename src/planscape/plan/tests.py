import json

from django.contrib.auth.models import User
from django.contrib.gis.geos import GEOSGeometry
from django.test import TransactionTestCase
from django.urls import reverse
from planscape.settings import PLANSCAPE_GUEST_CAN_SAVE

from .models import Plan, Project, Scenario


class CreatePlanTest(TransactionTestCase):
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
                {'geometry': {'type': 'MultiPolygon', 'coordinates': [[[[1, 2], [2, 3], [3, 4], [1, 2]]]]}}]}},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(Plan.objects.all()), 1)

    def test_good_region_name(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('plan:create'),
            {'name': 'plan', 'region_name': 'north_coast_inland', 'geometry': {'features': [
                {'geometry': {'type': 'MultiPolygon', 'coordinates': [[[[1, 2], [2, 3], [3, 4], [1, 2]]]]}}]}},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(Plan.objects.all()), 1)


def create_plan(owner: User | None, name: str, geometry: GEOSGeometry | None, scenarios: list[int]):
    """
    Creates a plan with the given owner, name, geometry, and projects with the
    number of scenarios.
    """
    plan = Plan.objects.create(
        owner=owner, name=name, region_name='sierra_cascade_inyo', geometry=geometry)
    plan.save()
    for num_scenarios in scenarios:
        project = Project.objects.create(owner=owner, plan=plan)
        project.save()
        for _ in range(num_scenarios):
            scenario = Scenario.objects.create(project=project)
            scenario.save()
    return plan


class DeletePlanTest(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create(username='testuser')
        self.user.set_password('12345')
        self.user.save()
        self.plan1 = create_plan(None, "ownerless", None, [0])
        self.plan2 = create_plan(self.user, "owned", None, [1])

    def test_delete_user_not_logged_in(self):
        response = self.client.post(
            reverse('plan:delete'), {'id': self.plan2.pk},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(len(Plan.objects.all()), 2)
        self.assertEqual(len(Project.objects.all()), 2)
        self.assertEqual(len(Scenario.objects.all()), 1)

    def test_user_logged_in_tries_to_delete_ownerless_plan(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('plan:delete'), {'id': self.plan1.pk},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(len(Plan.objects.all()), 2)
        self.assertEqual(len(Project.objects.all()), 2)
        self.assertEqual(len(Scenario.objects.all()), 1)

    def test_delete_wrong_user(self):
        new_user = User.objects.create(username='newuser')
        new_user.set_password('12345')
        new_user.save()
        self.client.force_login(new_user)
        response = self.client.post(
            reverse('plan:delete'), {'id': self.plan2.pk},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(len(Plan.objects.all()), 2)
        self.assertEqual(len(Project.objects.all()), 2)
        self.assertEqual(len(Scenario.objects.all()), 1)

    def test_delete_ownerless_plan(self):
        self.assertEqual(len(Plan.objects.all()), 2)
        plan1_id = self.plan1.pk
        response = self.client.post(
            reverse('plan:delete'), {'id': self.plan1.pk},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, str(plan1_id).encode())
        self.assertEqual(len(Plan.objects.all()), 1)
        self.assertEqual(len(Project.objects.all()), 1)
        self.assertEqual(len(Scenario.objects.all()), 1)

    def test_delete_owned_plan(self):
        self.client.force_login(self.user)
        self.assertEqual(len(Plan.objects.all()), 2)
        plan2_id = self.plan2.pk
        response = self.client.post(
            reverse('plan:delete'), {'id': self.plan2.pk},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, str(plan2_id).encode())
        self.assertEqual(len(Plan.objects.all()), 1)
        self.assertEqual(len(Project.objects.all()), 1)
        self.assertEqual(len(Scenario.objects.all()), 0)


class GetPlanTest(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create(username='testuser')
        self.user.set_password('12345')
        self.user.save()
        self.geometry = {'type': 'MultiPolygon',
                         'coordinates': [[[[1, 2], [2, 3], [3, 4], [1, 2]]]]}
        stored_geometry = GEOSGeometry(json.dumps(self.geometry))
        self.plan_no_user = create_plan(None, 'ownerless', stored_geometry, [])
        self.plan_with_user = create_plan(self.user, 'owned', None, [])

    def test_get_plan_with_user(self):
        response = self.client.get(reverse('plan:get_plan'), {'id': self.plan_with_user.pk},
                                   content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['name'], 'owned')

    def test_get_plan_no_user(self):
        response = self.client.get(reverse('plan:get_plan'), {'id': self.plan_no_user.pk},
                                   content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['name'], 'ownerless')
        self.assertEqual(response.json()['geometry'], self.geometry)


class ListPlansTest(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create(username='testuser')
        self.user.set_password('12345')
        self.user.save()
        self.geometry = {'type': 'MultiPolygon',
                         'coordinates': [[[[1, 2], [2, 3], [3, 4], [1, 2]]]]}
        stored_geometry = GEOSGeometry(json.dumps(self.geometry))
        self.plan1 = create_plan(None, 'plan1', None, [])
        self.plan2 = create_plan(None, 'plan2', stored_geometry, [0])
        self.plan3 = create_plan(self.user, 'plan3', stored_geometry, [1])
        self.plan4 = create_plan(self.user, 'plan4', stored_geometry, [2, 1])

    def test_list_plans_by_owner_no_user(self):
        response = self.client.get(reverse('plan:list_plans_by_owner'), {},
                                   content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 2)
        for plan in response.json():
            if plan['name'] == 'plan1':
                self.assertEqual(plan['projects'], 0)
                self.assertEqual(plan['scenarios'], 0)
            elif plan['name'] == 'plan2':
                self.assertEqual(plan['projects'], 1)
                self.assertEqual(plan['scenarios'], 0)
            else:
                self.assertTrue(False)

    def test_list_plans_by_owner_with_user(self):
        response = self.client.get(reverse('plan:list_plans_by_owner'), {'owner': self.user.pk},
                                   content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 2)
        for plan in response.json():
            self.assertEqual(plan['geometry'], self.geometry)
            if plan['name'] == 'plan3':
                self.assertEqual(plan['projects'], 1)
                self.assertEqual(plan['scenarios'], 1)
            elif plan['name'] == 'plan4':
                self.assertEqual(plan['projects'], 2)
                self.assertEqual(plan['scenarios'], 3)
            else:
                self.assertTrue(False)


class ProjectTest(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create(username='testuser')
        self.user.set_password('12345')
        self.user.save()
        self.plan_no_user = Plan.objects.create(
            owner=None, name='ownerless', region_name='sierra_cascade_inyo')
        self.plan_with_user = Plan.objects.create(
            owner=self.user, name='with_owner', region_name='sierra_cascade_inyo')

    def test_missing_user(self):
        response = self.client.post(
            reverse('plan:create_project'), {'max_cost': 100},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_missing_plan(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('plan:create_project'), {'max_cost': 100},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_null_user_cannot_create_project_with_user(self):
        PLANSCAPE_GUEST_CAN_SAVE = False
        response = self.client.post(
            reverse('plan:create_project'), {
                'plan_id': self.plan_with_user.pk, 'max_cost': 100},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_user_cannot_create_project_with_null_user(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('plan:create_project'), {
                'plan_id': self.plan_no_user.pk, 'max_cost': 100},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_no_user(self):
        PLANSCAPE_GUEST_CAN_SAVE = False
        response = self.client.post(
            reverse('plan:create_project'), {
                'plan_id': self.plan_no_user.pk, 'max_cost': 100},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)

    def test_good_with_user(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('plan:create_project'), {
                'plan_id': self.plan_with_user.pk, 'max_cost': 100},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
