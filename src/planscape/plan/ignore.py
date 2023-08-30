# 'plan' app to be replaced with 'planning' app, these tests are no longer needed but will be kept for reference for now

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

from .models import (ConditionScores, Plan, Project, ProjectArea, Scenario,
                     ScenarioWeightedPriority)


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
        self.assertEqual(Plan.objects.count(), 1)

    def test_good_multipolygon(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('plan:create'),
            {'name': 'plan', 'geometry': {'features': [
                {'geometry': {'type': 'MultiPolygon', 'coordinates': [[[[1, 2], [2, 3], [3, 4], [1, 2]]]]}}]}},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Plan.objects.count(), 1)

    def test_bad_region_name(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('plan:create'),
            {'name': 'plan', 'region_name': 'north_coast_inland', 'geometry': {'features': [
                {'geometry': {'type': 'MultiPolygon', 'coordinates': [[[[1, 2], [2, 3], [3, 4], [1, 2]]]]}}]}},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_good_region_name(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('plan:create'),
            {'name': 'plan', 'region_name': 'Northern California', 'geometry': {'features': [
                {'geometry': {'type': 'MultiPolygon', 'coordinates': [[[[1, 2], [2, 3], [3, 4], [1, 2]]]]}}]}},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        plans = Plan.objects.all()
        self.assertEqual(plans.count(), 1)
        plan = plans.first()
        assert plan is not None
        self.assertEqual(plan.region_name, 'north_coast_inland')


def create_plan(
        owner: User | None, name: str, geometry: GEOSGeometry | None,
        scenarios: list[int]):
    """
    Creates a plan with the given owner, name, geometry, and projects with the
    number of scenarios.
    """
    plan = Plan.objects.create(
        owner=owner, name=name, region_name='sierra_cascade_inyo',
        geometry=geometry)
    plan.save()
    for num_scenarios in scenarios:
        project = Project.objects.create(owner=owner, plan=plan)
        project.save()
        for _ in range(num_scenarios):
            scenario = Scenario.objects.create(
                owner=owner, plan=plan, project=project)
            scenario.save()
    return plan


class DeletePlanTest(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create(username='testuser')
        self.user.set_password('12345')
        self.user.save()
        self.plan1 = create_plan(None, "ownerless", None, [0])
        self.plan2 = create_plan(self.user, "owned", None, [1])
        self.plan3 = create_plan(self.user, "owned_also", None, [1, 2])

    def test_delete_user_not_logged_in(self):
        response = self.client.post(
            reverse('plan:delete'), {'id': self.plan2.pk},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Plan.objects.count(), 3)
        self.assertEqual(Project.objects.all().count(), 4)
        self.assertEqual(Scenario.objects.count(), 4)

    def test_user_logged_in_tries_to_delete_ownerless_plan(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('plan:delete'), {'id': self.plan1.pk},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Plan.objects.count(), 3)
        self.assertEqual(Project.objects.count(), 4)
        self.assertEqual(Scenario.objects.count(), 4)

    def test_delete_wrong_user(self):
        new_user = User.objects.create(username='newuser')
        new_user.set_password('12345')
        new_user.save()
        self.client.force_login(new_user)
        response = self.client.post(
            reverse('plan:delete'), {'id': self.plan2.pk},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Plan.objects.count(), 3)
        self.assertEqual(Project.objects.count(), 4)
        self.assertEqual(Scenario.objects.count(), 4)

    def test_delete_ownerless_plan(self):
        self.assertEqual(Plan.objects.count(), 3)
        plan1_id = self.plan1.pk
        response = self.client.post(
            reverse('plan:delete'), {'id': self.plan1.pk},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, json.dumps(
            {"id": [self.plan1.pk]}).encode())
        self.assertEqual(Plan.objects.count(), 2)
        self.assertEqual(Project.objects.count(), 3)
        self.assertEqual(Scenario.objects.count(), 4)

    def test_delete_owned_plan(self):
        self.client.force_login(self.user)
        self.assertEqual(Plan.objects.count(), 3)
        response = self.client.post(
            reverse('plan:delete'), {'id': self.plan2.pk},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, json.dumps(
            {"id": [self.plan2.pk]}).encode())
        self.assertEqual(Plan.objects.count(), 2)
        self.assertEqual(Project.objects.count(), 3)
        self.assertEqual(Scenario.objects.count(), 3)

    def test_delete_multiple_plans_fails_if_any_not_owner(self):
        self.client.force_login(self.user)
        self.assertEqual(Plan.objects.count(), 3)
        plan_ids = [self.plan1.pk, self.plan2.pk]
        response = self.client.post(
            reverse('plan:delete'), {'id': plan_ids},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Plan.objects.count(), 3)
        self.assertEqual(Project.objects.count(), 4)
        self.assertEqual(Scenario.objects.count(), 4)

    def test_delete_multiple_plans(self):
        self.client.force_login(self.user)
        self.assertEqual(Plan.objects.count(), 3)
        plan_ids = [self.plan2.pk, self.plan3.pk]
        response = self.client.post(
            reverse('plan:delete'), {'id': plan_ids},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, json.dumps(
            {"id": plan_ids}).encode())
        self.assertEqual(Plan.objects.count(), 1)
        self.assertEqual(Project.objects.count(), 1)
        self.assertEqual(Scenario.objects.count(), 0)


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
        self.client.force_login(self.user)
        response = self.client.get(
            reverse('plan:get_plan'),
            {'id': self.plan_with_user.pk},
            content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['name'], 'owned')
        self.assertEqual(response.json()['region_name'], 'Sierra Nevada')

    def test_get_nonexistent_plan(self):
        self.client.force_login(self.user)
        response = self.client.get(reverse('plan:get_plan'), {'id': 25},
                                   content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_get_plan_does_not_belong_to_user(self):
        self.client.force_login(self.user)
        response = self.client.get(
            reverse('plan:get_plan'),
            {'id': self.plan_no_user.pk},
            content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_get_plan_no_user(self):
        response = self.client.get(
            reverse('plan:get_plan'),
            {'id': self.plan_no_user.pk},
            content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['name'], 'ownerless')
        self.assertEqual(response.json()['geometry'], self.geometry)
        self.assertLessEqual(
            response.json()['creation_timestamp'],
            round(datetime.datetime.now().timestamp()))
        self.assertEqual(response.json()['region_name'], 'Sierra Nevada')

    def test_get_plan_bad_stored_region(self):
        self.client.force_login(self.user)
        plan = Plan.objects.create(
            owner=self.user, name='badregion', region_name='Sierra Nevada',
            geometry=None)
        plan.save()
        response = self.client.get(reverse('plan:get_plan'), {'id': plan.pk},
                                   content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['name'], 'badregion')
        self.assertTrue(isinstance(response.json()['creation_timestamp'], int))
        self.assertLessEqual(
            response.json()['creation_timestamp'],
            round(datetime.datetime.now().timestamp()))
        self.assertEqual(response.json()['region_name'], None)


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
            self.assertTrue('geometry' not in plan)
            self.assertEqual(plan['region_name'], 'Sierra Nevada')
            if plan['name'] == 'plan1':
                self.assertEqual(plan['projects'], 0)
                self.assertEqual(plan['scenarios'], 0)
            elif plan['name'] == 'plan2':
                self.assertEqual(plan['projects'], 1)
                self.assertEqual(plan['scenarios'], 0)
            else:
                self.assertTrue(False)

    def test_list_plans_by_owner_no_user_logged_in(self):
        self.client.force_login(self.user)
        response = self.client.get(reverse('plan:list_plans_by_owner'), {},
                                   content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 2)
        for plan in response.json():
            self.assertTrue('geometry' not in plan)
            self.assertEqual(plan['region_name'], 'Sierra Nevada')
            if plan['name'] == 'plan3':
                self.assertEqual(plan['projects'], 1)
                self.assertEqual(plan['scenarios'], 1)
            elif plan['name'] == 'plan4':
                self.assertEqual(plan['projects'], 2)
                self.assertEqual(plan['scenarios'], 3)
            else:
                self.assertTrue(False)

    def test_list_plans_by_owner_with_user(self):
        response = self.client.get(
            reverse('plan:list_plans_by_owner'),
            {'owner': self.user.pk},
            content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 2)
        for plan in response.json():
            self.assertTrue('geometry' not in plan)
            self.assertEqual(plan['region_name'], 'Sierra Nevada')
            if plan['name'] == 'plan3':
                self.assertEqual(plan['projects'], 1)
                self.assertEqual(plan['scenarios'], 1)
            elif plan['name'] == 'plan4':
                self.assertEqual(plan['projects'], 2)
                self.assertEqual(plan['scenarios'], 3)
            else:
                self.assertTrue(False)


class CreateProjectTest(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create(username='testuser')
        self.user.set_password('12345')
        self.user.save()
        self.plan_no_user = Plan.objects.create(
            owner=None, name='ownerless', region_name='sierra_cascade_inyo')
        self.plan_with_user = Plan.objects.create(
            owner=self.user, name='with_owner',
            region_name='sierra_cascade_inyo')

    def test_missing_user(self):
        response = self.client.post(
            reverse('plan:create_project'), {},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_missing_plan(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('plan:create_project'), {},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_null_user_cannot_create_project_with_user(self):
        settings.PLANSCAPE_GUEST_CAN_SAVE = True
        response = self.client.post(
            reverse('plan:create_project'), {
                'plan_id': self.plan_with_user.pk},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_user_cannot_create_project_with_null_user(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('plan:create_project'), {
                'plan_id': self.plan_no_user.pk},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_no_user(self):
        settings.PLANSCAPE_GUEST_CAN_SAVE = True
        response = self.client.post(
            reverse('plan:create_project'), {
                'plan_id': self.plan_no_user.pk},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)

    def test_good_with_user(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('plan:create_project'), {
                'plan_id': self.plan_with_user.pk},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)

    def test_treatment_ratio_bad_format_negative(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('plan:create_project'), {
                'plan_id': self.plan_with_user.pk, 'max_treatment_area_ratio': -1},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_max_slope_bad_format_negative(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('plan:create_project'), {
                'plan_id': self.plan_with_user.pk, 'max_slope': -1},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_with_priority(self):
        self.client.force_login(self.user)
        self.base_condition = BaseCondition.objects.create(
            condition_name="condition1", condition_level=ConditionLevel.ELEMENT)
        self.raw_condition = Condition.objects.create(
            condition_dataset=self.base_condition, condition_score_type=ConditionScoreType.CURRENT, is_raw=True)
        self.normalized_condition = Condition.objects.create(
            condition_dataset=self.base_condition, condition_score_type=ConditionScoreType.CURRENT, is_raw=False)

        response = self.client.post(
            reverse('plan:create_project'), {
                'plan_id': self.plan_with_user.pk, 'priorities': ['condition1']},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)

    def test_with_nonexistent_priority(self):
        self.client.force_login(self.user)
        self.base_condition = BaseCondition.objects.create(
            condition_name="base_condition", condition_level=ConditionLevel.ELEMENT)
        self.condition1 = Condition.objects.create(
            condition_dataset=self.base_condition, condition_score_type=ConditionScoreType.CURRENT)

        response = self.client.post(
            reverse('plan:create_project'), {
                'plan_id': self.plan_with_user.pk, 'priorities': ['condition3']},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)


class UpdateProjectTest(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create(username='testuser')
        self.user.set_password('12345')
        self.user.save()

        self.plan_with_user = Plan.objects.create(
            owner=self.user, name='with_owner', region_name='sierra_cascade_inyo')

        self.base_condition = BaseCondition.objects.create(
            condition_name="condition1", condition_level=ConditionLevel.ELEMENT)
        self.condition1 = Condition.objects.create(
            condition_dataset=self.base_condition, condition_score_type=ConditionScoreType.CURRENT, is_raw=False)

        self.base_condition2 = BaseCondition.objects.create(
            condition_name="condition2", condition_level=ConditionLevel.ELEMENT)
        self.condition2_raw = Condition.objects.create(
            condition_dataset=self.base_condition2, condition_score_type=ConditionScoreType.CURRENT, is_raw=True)
        self.condition2_normalized = Condition.objects.create(
            condition_dataset=self.base_condition2, condition_score_type=ConditionScoreType.CURRENT, is_raw=False)

        self.project_with_user = Project.objects.create(
            owner=self.user, plan=self.plan_with_user, max_budget=100.0)
        self.project_with_user.priorities.add(self.condition1)

    def test_wrong_http(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('plan:update_project'), {}, content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_missing_id(self):
        self.client.force_login(self.user)
        response = self.client.put(
            reverse('plan:update_project'), {}, content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_update_constraint_value_remove_priority(self):
        self.client.force_login(self.user)
        response = self.client.put(
            reverse('plan:update_project'), {
                'id': self.project_with_user.pk, 'max_budget': 200.0},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        project = Project.objects.get(id=self.project_with_user.pk)
        self.assertEqual(project.max_budget, 200.0)
        self.assertEqual(project.priorities.count(), 0)

    def test_remove_constraint_remove_priority(self):
        self.client.force_login(self.user)
        response = self.client.put(
            reverse('plan:update_project'), {'id': self.project_with_user.pk},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        project = Project.objects.get(id=self.project_with_user.pk)
        self.assertEqual(project.max_budget, None)
        self.assertEqual(project.priorities.count(), 0)

    def test_add_constraint(self):
        self.client.force_login(self.user)
        response = self.client.put(
            reverse('plan:update_project'), {
                'id': self.project_with_user.pk, 'max_slope': 0.5},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        project = Project.objects.get(id=self.project_with_user.pk)
        self.assertEqual(project.max_budget, None)
        self.assertEqual(project.max_slope, 0.5)
        self.assertEqual(project.priorities.count(), 0)

    def test_add_priority(self):
        self.client.force_login(self.user)
        response = self.client.put(
            reverse('plan:update_project'), {'id': self.project_with_user.pk,
                                             'priorities': ['condition2']}, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        project = Project.objects.get(id=self.project_with_user.pk)
        self.assertEqual(project.max_budget, None)
        self.assertEqual(project.priorities.count(), 1)
        self.assertTrue(project.priorities.contains(
            self.condition2_normalized))

    def test_patch_invalid_body(self):
        self.client.force_login(self.user)
        response = self.client.patch(
            reverse('plan:update_project'), {
                'id': self.project_with_user.pk, 'max_budget': 'invalid_string'},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_patch_update_constraint(self):
        self.client.force_login(self.user)
        project = Project.objects.get(id=self.project_with_user.pk)
        self.assertEqual(project.max_budget, 100.0)
        self.assertEqual(project.priorities.count(), 1)
        response = self.client.patch(
            reverse('plan:update_project'), {
                'id': self.project_with_user.pk, 'max_budget': 200.0},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        project = Project.objects.get(id=self.project_with_user.pk)
        self.assertEqual(project.max_budget, 200.0)
        self.assertEqual(project.priorities.count(), 1)

    def test_patch_remove_constraint(self):
        self.client.force_login(self.user)
        project = Project.objects.get(id=self.project_with_user.pk)
        self.assertEqual(project.max_budget, 100.0)
        self.assertEqual(project.priorities.count(), 1)
        response = self.client.patch(
            reverse('plan:update_project'), {
                'id': self.project_with_user.pk, 'max_budget': None},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        project = Project.objects.get(id=self.project_with_user.pk)
        self.assertEqual(project.max_budget, None)
        self.assertEqual(project.priorities.count(), 1)

    def test_patch_add_constraint(self):
        self.client.force_login(self.user)
        project = Project.objects.get(id=self.project_with_user.pk)
        self.assertEqual(project.max_budget, 100.0)
        self.assertEqual(project.max_slope, None)
        self.assertEqual(project.priorities.count(), 1)
        response = self.client.patch(
            reverse('plan:update_project'), {
                'id': self.project_with_user.pk, 'max_slope': 0.5},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        project = Project.objects.get(id=self.project_with_user.pk)
        self.assertEqual(project.max_budget, 100)
        self.assertEqual(project.max_slope, 0.5)
        self.assertEqual(project.priorities.count(), 1)

    def test_patch_add_priority(self):
        self.client.force_login(self.user)
        project = Project.objects.get(id=self.project_with_user.pk)
        self.assertEqual(project.max_budget, 100.0)
        self.assertEqual(project.priorities.count(), 1)
        response = self.client.patch(
            reverse('plan:update_project'), {'id': self.project_with_user.pk,
                                             'priorities': ['condition1', 'condition2']},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        project = Project.objects.get(id=self.project_with_user.pk)
        self.assertEqual(project.max_budget, 100)
        self.assertEqual(project.priorities.count(), 2)
        self.assertTrue(project.priorities.contains(
            self.condition2_normalized))

    def test_patch_remove_priority(self):
        self.client.force_login(self.user)
        project = Project.objects.get(id=self.project_with_user.pk)
        self.assertEqual(project.max_budget, 100.0)
        self.assertEqual(project.priorities.count(), 1)
        response = self.client.patch(
            reverse('plan:update_project'), {'id': self.project_with_user.pk,
                                             'priorities': []}, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        project = Project.objects.get(id=self.project_with_user.pk)
        self.assertEqual(project.max_budget, 100)
        self.assertEqual(project.priorities.count(), 0)


class DeleteProjectsTest(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create(username='testuser')
        self.user.set_password('12345')
        self.user.save()

        self.plan_with_user = Plan.objects.create(
            owner=self.user, name='with_owner', region_name='sierra_cascade_inyo')
        self.plan_with_no_user = Plan.objects.create(
            owner=None, name='without owner', region_name='sierra_cascade_inyo')

        self.project_with_user = Project.objects.create(
            owner=self.user, plan=self.plan_with_user, max_budget=100.0)
        self.project_with_user2 = Project.objects.create(
            owner=self.user, plan=self.plan_with_user, max_budget=50.0)

        self.project_with_no_user = Project.objects.create(
            owner=None, plan=self.plan_with_no_user, max_budget=100.0)

    def test_delete_user_not_logged_in(self):
        response = self.client.post(
            reverse('plan:delete_projects'), {
                'project_ids': [self.project_with_user.pk]},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Project.objects.all().count(), 3)

    def test_user_logged_in_tries_to_delete_ownerless_project(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('plan:delete_projects'), {
                'project_ids': [self.project_with_no_user.pk]},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Project.objects.count(), 3)

    def test_delete_wrong_user(self):
        new_user = User.objects.create(username='newuser')
        new_user.set_password('12345')
        new_user.save()
        self.client.force_login(new_user)
        response = self.client.post(
            reverse('plan:delete_projects'), {
                'project_ids': [self.project_with_user.pk]},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Project.objects.count(), 3)

    def test_delete_ownerless_project(self):
        self.assertEqual(Project.objects.count(), 3)
        response = self.client.post(
            reverse('plan:delete_projects'), {
                'project_ids': [self.project_with_no_user.pk]},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, json.dumps(
            [self.project_with_no_user.pk]).encode())
        self.assertEqual(Project.objects.count(), 2)

    def test_delete_owned_project(self):
        self.client.force_login(self.user)
        self.assertEqual(Project.objects.count(), 3)
        response = self.client.post(
            reverse('plan:delete_projects'), {
                'project_ids': [self.project_with_user.pk]},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, json.dumps(
            [self.project_with_user.pk]).encode())
        self.assertEqual(Project.objects.count(), 2)

    def test_delete_multiple_projects_fails_if_any_not_owner(self):
        self.client.force_login(self.user)
        self.assertEqual(Project.objects.count(), 3)
        project_ids = [self.project_with_no_user.pk, self.project_with_user.pk]
        response = self.client.post(
            reverse('plan:delete_projects'), {'project_ids': project_ids},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Project.objects.count(), 3)

    def test_delete_multiple_projects(self):
        self.client.force_login(self.user)
        self.assertEqual(Project.objects.count(), 3)
        project_ids = [self.project_with_user.pk, self.project_with_user2.pk]
        response = self.client.post(
            reverse('plan:delete_projects'), {'project_ids': project_ids},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, json.dumps(
            project_ids).encode())
        self.assertEqual(Project.objects.count(), 1)


class CreateProjectAreaTest(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create(username='testuser')
        self.user.set_password('12345')
        self.user.save()

        self.plan_no_user = Plan.objects.create(
            owner=None, name='ownerless', region_name='sierra_cascade_inyo')
        self.project_no_user = Project.objects.create(
            owner=None, plan=self.plan_no_user)

    # TODO: re-enable when we restrict functionality to logged in users
    # def test_missing_user(self):
    #     response = self.client.post(
    #         reverse('plan:create_project_area'), {'name': 'project_area'},
    #         content_type='application/json')
    #     self.assertEqual(response.status_code, 200)

    def test_missing_project(self):
        response = self.client.post(
            reverse('plan:create_project_area'),
            {},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_missing_geometry(self):
        response = self.client.post(
            reverse('plan:create_project_area'),
            {'project_id': self.project_no_user.pk},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_missing_features(self):
        response = self.client.post(
            reverse('plan:create_project_area'), {
                'project_id': self.project_no_user.pk, 'geometry': {}},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_empty_features(self):
        response = self.client.post(
            reverse('plan:create_project_area'),
            {'project_id': self.project_no_user.pk, 'geometry': {'features': []}},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_bad_geometry(self):
        response = self.client.post(
            reverse('plan:create_project_area'),
            {'project_id': self.project_no_user.pk, 'geometry': {'features': [
                {'type': 'Point', 'coordinates': [1, 2]}]}},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_bad_polygon(self):
        response = self.client.post(
            reverse('plan:create_project_area'),
            {'project_id': self.project_no_user.pk, 'geometry': {'features': [
                {'geometry': {'type': 'Polygon'}}]}},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_good_polygon(self):
        response = self.client.post(
            reverse('plan:create_project_area'),
            {'project_id': self.project_no_user.pk, 'geometry': {'features': [
                {'geometry': {'type': 'Polygon', 'coordinates': [[[1, 2], [2, 3], [3, 4], [1, 2]]]}}]}},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(ProjectArea.objects.count(), 1)

    def test_good_multipolygon(self):
        response = self.client.post(
            reverse('plan:create_project_area'),
            {'project_id': self.project_no_user.pk, 'geometry': {'features': [
                {'geometry': {'type': 'MultiPolygon', 'coordinates': [[[[1, 2], [2, 3], [3, 4], [1, 2]]]]}}]}},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(ProjectArea.objects.count(), 1)


class GetProjectTest(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create(username='testuser')
        self.user.set_password('12345')
        self.user.save()

        self.geometry = {'type': 'MultiPolygon',
                         'coordinates': [[[[1, 2], [2, 3], [3, 4], [1, 2]]]]}
        stored_geometry = GEOSGeometry(json.dumps(self.geometry))

        self.plan_no_user = create_plan(None, 'ownerless', stored_geometry, [])
        self.project_no_user_no_pri = Project.objects.create(
            owner=None, plan=self.plan_no_user, max_budget=100)

        self.plan_with_user = create_plan(
            self.user, 'ownerless', stored_geometry, [])
        self.project_with_user_no_pri = Project.objects.create(
            owner=self.user, plan=self.plan_with_user, max_budget=100)

        self.base_condition1 = BaseCondition.objects.create(
            condition_name="name1", condition_level=ConditionLevel.ELEMENT)
        self.base_condition2 = BaseCondition.objects.create(
            condition_name="name2", condition_level=ConditionLevel.ELEMENT)
        self.condition1 = Condition.objects.create(
            condition_dataset=self.base_condition1, raster_name="name1")
        self.condition2 = Condition.objects.create(
            condition_dataset=self.base_condition2, raster_name="name2")

    def test_get_project_does_not_belong_to_user(self):
        self.client.force_login(self.user)
        response = self.client.get(
            reverse('plan:get_project'),
            {'id': self.project_no_user_no_pri.pk},
            content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_get_project_no_user_no_priorities(self):
        response = self.client.get(
            reverse('plan:get_project'),
            {'id': self.project_no_user_no_pri.pk},
            content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['owner'], None)
        self.assertEqual(response.json()['plan'], self.plan_no_user.pk)
        self.assertEqual(response.json()['max_budget'], 100)
        self.assertLessEqual(
            response.json()['creation_timestamp'],
            round(datetime.datetime.now().timestamp()))

    def test_get_project_no_priorities(self):
        self.client.force_login(self.user)
        response = self.client.get(
            reverse('plan:get_project'),
            {'id': self.project_with_user_no_pri.pk},
            content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['owner'], self.user.pk)
        self.assertEqual(response.json()['plan'], self.plan_with_user.pk)
        self.assertEqual(response.json()['max_budget'], 100)
        self.assertLessEqual(
            response.json()['creation_timestamp'],
            round(datetime.datetime.now().timestamp()))

    def test_get_nonexistent_project(self):
        self.client.force_login(self.user)
        response = self.client.get(reverse('plan:get_project'), {'id': 10},
                                   content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_get_project_no_user_with_priorities(self):
        self.project_no_user_no_pri.priorities.add(self.condition1)
        self.project_no_user_no_pri.priorities.add(self.condition2)

        response = self.client.get(
            reverse('plan:get_project'),
            {'id': self.project_no_user_no_pri.pk},
            content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['owner'], None)
        self.assertEqual(response.json()['plan'], self.plan_no_user.pk)
        self.assertEqual(response.json()['max_budget'], 100)
        self.assertEqual(response.json()['priorities'], ["name1", "name2"])
        self.assertLessEqual(
            response.json()['creation_timestamp'],
            round(datetime.datetime.now().timestamp()))

    def test_get_project_with_priorities(self):
        self.client.force_login(self.user)
        self.project_with_user_no_pri.priorities.add(self.condition1)
        self.project_with_user_no_pri.priorities.add(self.condition2)

        response = self.client.get(
            reverse('plan:get_project'),
            {'id': self.project_with_user_no_pri.pk},
            content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['owner'], self.user.pk)
        self.assertEqual(response.json()['plan'], self.plan_with_user.pk)
        self.assertEqual(response.json()['max_budget'], 100)
        self.assertEqual(response.json()['priorities'], ["name1", "name2"])
        self.assertLessEqual(
            response.json()['creation_timestamp'],
            round(datetime.datetime.now().timestamp()))


class ListProjectsTest(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create(username='testuser')
        self.user.set_password('12345')
        self.user.save()

        self.geometry = {'type': 'MultiPolygon',
                         'coordinates': [[[[1, 2], [2, 3], [3, 4], [1, 2]]]]}
        stored_geometry = GEOSGeometry(json.dumps(self.geometry))

        self.plan_with_user = create_plan(
            self.user, 'plan', stored_geometry, [])
        self.plan_without_user = create_plan(
            None, 'plan', stored_geometry, [])

    def test_list_no_plan_id(self):
        self.client.force_login(self.user)
        response = self.client.get(
            reverse('plan:list_projects_for_plan'),
            {},
            content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_list_no_matching_plan(self):
        self.client.force_login(self.user)
        response = self.client.get(
            reverse('plan:list_projects_for_plan'),
            {'plan_id': 4},
            content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_list_no_projects(self):
        self.client.force_login(self.user)
        response = self.client.get(
            reverse('plan:list_projects_for_plan'),
            {'plan_id': self.plan_with_user.pk},
            content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 0)

    def test_list_projects(self):
        self.client.force_login(self.user)
        base_condition = BaseCondition.objects.create(
            condition_level=ConditionLevel.ELEMENT, condition_name='test_condition')
        self.condition = Condition.objects.create(
            condition_dataset=base_condition)
        self.project_with_user = Project.objects.create(
            owner=self.user, plan=self.plan_with_user, max_budget=100)
        self.project_with_user.priorities.add(self.condition)

        response = self.client.get(
            reverse('plan:list_projects_for_plan'),
            {'plan_id': self.plan_with_user.pk},
            content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]['id'], self.project_with_user.pk)
        self.assertEqual(response.json()[0]['priorities'], ['test_condition'])
        self.assertLessEqual(
            response.json()[0]['creation_timestamp'],
            round(datetime.datetime.now().timestamp()))


class GetProjectAreaTest(TransactionTestCase):
    def setUp(self):
        self.geometry = {'type': 'MultiPolygon',
                         'coordinates': [[[[1, 2], [2, 3], [3, 4], [1, 2]]]]}
        stored_geometry = GEOSGeometry(json.dumps(self.geometry))

        self.base_condition = BaseCondition.objects.create(
            condition_name="name", condition_level=ConditionLevel.ELEMENT)
        self.condition1 = Condition.objects.create(
            condition_dataset=self.base_condition, raster_name="name1")
        self.condition2 = Condition.objects.create(
            condition_dataset=self.base_condition, raster_name="name2")

        self.plan_no_user = create_plan(None, 'ownerless', stored_geometry, [])
        self.project_no_user = Project.objects.create(
            owner=None, plan=self.plan_no_user, max_budget=100)
        self.project_area_no_user = ProjectArea.objects.create(
            owner=None, project=self.project_no_user,
            project_area=stored_geometry, estimated_area_treated=100)
        self.project_area_no_user2 = ProjectArea.objects.create(
            owner=None, project=self.project_no_user, project_area=stored_geometry)
        self.project_no_user_no_projectareas = Project.objects.create(
            owner=None, plan=self.plan_no_user, max_budget=200)

        self.user = User.objects.create(username='testuser')
        self.user.set_password('12345')
        self.user.save()
        self.plan_with_user = create_plan(
            self.user, 'ownerless', stored_geometry, [])
        self.project_with_user = Project.objects.create(
            owner=self.user, plan=self.plan_with_user, max_budget=100)
        self.project_area_with_user = ProjectArea.objects.create(
            owner=self.user, project=self.project_with_user,
            project_area=stored_geometry, estimated_area_treated=200)

    def test_get_project_does_not_belong_to_user(self):
        self.client.force_login(self.user)
        response = self.client.get(
            reverse('plan:get_project_areas'),
            {'id': self.project_no_user.pk},
            content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_get_projectareas_for_nonexistent_project(self):
        response = self.client.get(
            reverse('plan:get_project_areas'),
            {'project_id': 10},
            content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_get_projectareas_no_project_id(self):
        response = self.client.get(reverse('plan:get_project_areas'), {},
                                   content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_get_projectareas_no_results(self):
        response = self.client.get(
            reverse('plan:get_project_areas'),
            {'project_id': self.project_no_user_no_projectareas.pk},
            content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 0)

    def test_get_projectareas_no_user(self):
        response = self.client.get(
            reverse('plan:get_project_areas'),
            {'project_id': self.project_no_user.pk},
            content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 2)
        project_area_id = str(self.project_area_no_user.pk)
        self.assertEqual(
            response.json()[project_area_id]['properties']['owner'], None)
        self.assertEqual(
            response.json()[project_area_id]['properties']['project'],
            self.project_no_user.pk)
        self.assertEqual(
            response.json()[project_area_id]['properties']['estimated_area_treated'], 100)
        self.assertEqual(
            response.json()[project_area_id]['geometry'], self.geometry)

    def test_get_projectareas_with_user(self):
        self.client.force_login(self.user)
        response = self.client.get(
            reverse('plan:get_project_areas'),
            {'project_id': self.project_with_user.pk},
            content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        project_area_id = str(self.project_area_with_user.pk)
        self.assertEqual(
            response.json()[project_area_id]['properties']['owner'],
            self.user.pk)
        self.assertEqual(
            response.json()[project_area_id]['properties']['project'],
            self.project_with_user.pk)
        self.assertEqual(
            response.json()[project_area_id]['properties']['estimated_area_treated'], 200)
        self.assertEqual(
            response.json()[project_area_id]['geometry'], self.geometry)


class GetScoresTest(TransactionTestCase):
    def setUp(self) -> None:
        # Add a row for CRS 9822 to the spatial_ref_sys table, and the GeoTiff to the table.
        # with connection.cursor() as cursor:
        #     query = ("insert into spatial_ref_sys(srid, proj4text) values(9822, '{}')").format(
        #         settings.CRS_9822_PROJ4)
        #     cursor.execute(query)

        self.user = User.objects.create(username='testuser')
        self.user.set_password('12345')
        self.user.save()

        self.region = 'sierra_cascade_inyo'

    def test_user_signed_in(self) -> None:
        self._set_up_db(self.user)
        self.client.force_login(self.user)
        response = self.client.get(
            reverse('plan:get_scores'),
            {'id': self.plan.pk},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertDictEqual(response.json(), {'conditions': [
                             {'condition': 'foo', 'mean_score': 5.0}, {'condition': 'bar'}]})

    def test_user_not_signed_but_guests_can_save(self) -> None:
        settings.PLANSCAPE_GUEST_CAN_SAVE = True
        self._set_up_db(None)
        response = self.client.get(
            reverse('plan:get_scores'),
            {'id': self.plan.pk},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertDictEqual(response.json(), {'conditions': [
                             {'condition': 'foo', 'mean_score': 5.0}, {'condition': 'bar'}]})

    def test_user_not_signed_and_guests_cant_save(self) -> None:
        settings.PLANSCAPE_GUEST_CAN_SAVE = False
        self._set_up_db(None)
        response = self.client.get(
            reverse('plan:get_scores'),
            {'id': self.plan.pk},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def _create_condition_db(self, condition_name: str,
                             condition_raster_name: str) -> int:
        base_condition = BaseCondition.objects.create(
            condition_name=condition_name, region_name=self.region,
            condition_level=ConditionLevel.METRIC)
        condition = Condition.objects.create(
            raster_name=condition_raster_name,
            condition_dataset=base_condition, is_raw=False)
        ConditionRaster.objects.create(name=condition_raster_name)
        return condition.pk

    def _set_up_db(self, plan_owner: User) -> None:
        polygon = Polygon(
            ((-120, 40),
             (-120, 41),
             (-121, 41),
             (-121, 40),
             (-120, 40)))
        geo = MultiPolygon(polygon)
        geo.srid = 4269
        self.plan = create_plan(plan_owner, "my_plan", geo, [])

        foo_id = self._create_condition_db("foo", "foo_normalized")
        ConditionScores.objects.create(
            plan=self.plan, condition_id=foo_id, mean_score=5.0)

        bar_id = self._create_condition_db("bar", "bar_normalized")
        ConditionScores.objects.create(
            plan=self.plan, condition_id=bar_id, mean_score=None)


class CreateScenarioTest(TransactionTestCase):
    def setUp(self):
        self.geometry = {'type': 'MultiPolygon',
                         'coordinates': [[[[1, 2], [2, 3], [3, 4], [1, 2]]]]}
        self.stored_geometry = GEOSGeometry(json.dumps(self.geometry))

        self.base_condition = BaseCondition.objects.create(
            condition_name="cond", condition_level=ConditionLevel.ELEMENT)
        self.condition1 = Condition.objects.create(
            condition_dataset=self.base_condition, raster_name="raster_name",
            condition_score_type=ConditionScoreType.CURRENT, is_raw=False)

        self.user = User.objects.create(username='testuser')
        self.user.set_password('12345')
        self.user.save()

        self.plan = create_plan(
            self.user, 'plan', self.stored_geometry, [])
        self.project = Project.objects.create(
            owner=self.user, plan=self.plan, max_budget=100)
        self.project_area = ProjectArea.objects.create(
            owner=self.user, project=self.project,
            project_area=self.stored_geometry, estimated_area_treated=200)

    def test_create_scenario_for_nonexistent_plan(self):
        response = self.client.post(
            reverse('plan:create_scenario'),
            {'plan_id': 10},
            content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_create_scenario_for_not_owned_plan(self):
        self.client.force_login(self.user)
        not_my_plan = create_plan(
            None, 'not_my_plan', self.stored_geometry, [])
        response = self.client.post(
            reverse('plan:create_scenario'),
            {'plan_id': not_my_plan.pk},
            content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_create_scenario_for_nonexistent_project(self):
        response = self.client.post(
            reverse('plan:create_scenario'),
            {'plan_id': self.plan.pk, 'project_id': 10},
            content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_create_scenario_for_not_owned_project(self):
        response = self.client.post(
            reverse('plan:create_scenario'),
            {'plan_id': self.plan.pk, 'project_id': self.project.pk},
            content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_create_scenario_invalid_budget(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('plan:create_scenario'),
            {'plan_id': self.plan.pk, 'project_id': self.project.pk,
                'max_budget': "string"},
            content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_create_scenario_invalid_treatment_area_ratio(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('plan:create_scenario'),
            {'plan_id': self.plan.pk, 'project_id': self.project.pk,
                'max_treatment_area_ratio': -1},
            content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_create_scenario_invalid_road_dist(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('plan:create_scenario'),
            {'plan_id': self.plan.pk, 'project_id': self.project.pk,
                'max_road_distance': -1},
            content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_create_scenario_invalid_slope(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('plan:create_scenario'),
            {'plan_id': self.plan.pk, 'project_id': self.project.pk, 'max_slope': -1},
            content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_create_scenario_no_priorities(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('plan:create_scenario'),
            {'plan_id': self.plan.pk, 'project_id': self.project.pk, 'priorities': []},
            content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_create_scenrio_priorites_and_weights_dont_match(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('plan:create_scenario'),
            {'plan_id': self.plan.pk, 'project_id': self.project.pk, 'priorities': [
                'cond1'], 'weights': [3, 4, 5]},
            content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_create_scenario_with_weights(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('plan:create_scenario'),
            {'plan_id': self.plan.pk, 'project_id': self.project.pk, 'priorities': [
                'cond'], 'weights': [1], 'notes': 'this is my note'},
            content_type="application/json")
        self.assertEqual(response.status_code, 200)
        scenario = Scenario.objects.get(id=response.content)
        self.assertEqual(scenario.notes, 'this is my note')
        weighted_pris = ScenarioWeightedPriority.objects.filter(
            scenario=scenario.pk)
        self.assertEqual(weighted_pris.count(), 1)


class UpdateScenarioTest(TransactionTestCase):
    def setUp(self):
        self.geometry = {'type': 'MultiPolygon',
                         'coordinates': [[[[1, 2], [2, 3], [3, 4], [1, 2]]]]}
        stored_geometry = GEOSGeometry(json.dumps(self.geometry))

        self.base_condition = BaseCondition.objects.create(
            condition_name="cond1", condition_level=ConditionLevel.ELEMENT)
        self.condition1 = Condition.objects.create(
            condition_dataset=self.base_condition, raster_name="name1", is_raw=False)

        self.user = User.objects.create(username='testuser')
        self.user.set_password('12345')
        self.user.save()

        self.plan = create_plan(
            self.user, 'plan', stored_geometry, [])
        self.project = Project.objects.create(
            owner=self.user, plan=self.plan, max_budget=100)
        self.project_area = ProjectArea.objects.create(
            owner=self.user, project=self.project,
            project_area=stored_geometry, estimated_area_treated=200)
        self.scenario = Scenario.objects.create(
            owner=self.user, plan=self.plan, project=self.project, notes='old note')
        self.weight = ScenarioWeightedPriority.objects.create(
            scenario=self.scenario, priority=self.condition1, weight=2)

    def test_create_scenario_invalid_id(self):
        self.client.force_login(self.user)
        response = self.client.patch(
            reverse('plan:update_scenario'),
            {'id': 10},
            content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_update_not_owned_scenario(self):
        response = self.client.patch(
            reverse('plan:update_scenario'),
            {'id': self.scenario.pk},
            content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_update_note(self):
        self.client.force_login(self.user)
        response = self.client.patch(
            reverse('plan:update_scenario'),
            {'id': self.scenario.pk, 'notes': "new note"},
            content_type="application/json")
        self.assertEqual(response.status_code, 200)
        scenario = Scenario.objects.get(id=self.scenario.pk)
        self.assertEqual(scenario.project, self.project)
        self.assertEqual(scenario.notes, "new note")
        self.assertEqual(scenario.status, Scenario.ScenarioStatus.INITIALIZED)

    def test_remove_note(self):
        self.client.force_login(self.user)
        response = self.client.patch(
            reverse('plan:update_scenario'),
            {'id': self.scenario.pk, 'notes': None},
            content_type="application/json")
        self.assertEqual(response.status_code, 200)
        scenario = Scenario.objects.get(id=self.scenario.pk)
        self.assertEqual(scenario.project, self.project)
        self.assertEqual(scenario.notes, None)
        self.assertEqual(scenario.status, Scenario.ScenarioStatus.INITIALIZED)

    def test_update_invalid_status(self):
        self.client.force_login(self.user)
        response = self.client.patch(
            reverse('plan:update_scenario'),
            {'id': self.scenario.pk, 'status': 99},
            content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_update_status(self):
        self.client.force_login(self.user)
        response = self.client.patch(
            reverse('plan:update_scenario'),
            {'id': self.scenario.pk, 'status': Scenario.ScenarioStatus.SUCCESS},
            content_type="application/json")
        self.assertEqual(response.status_code, 200)
        scenario = Scenario.objects.get(id=self.scenario.pk)
        self.assertEqual(scenario.project, self.project)
        self.assertEqual(scenario.notes, "old note")
        self.assertEqual(scenario.status, Scenario.ScenarioStatus.SUCCESS)


class GetScenarioTest(TransactionTestCase):
    def setUp(self):
        self.geometry = {'type': 'MultiPolygon',
                         'coordinates': [[[[1, 2], [2, 3], [3, 4], [1, 2]]]]}
        stored_geometry = GEOSGeometry(json.dumps(self.geometry))

        self.base_condition = BaseCondition.objects.create(
            condition_name="cond1", condition_level=ConditionLevel.ELEMENT)
        self.condition1 = Condition.objects.create(
            condition_dataset=self.base_condition, raster_name="name1", is_raw=False)
        self.base_condition2 = BaseCondition.objects.create(
            condition_name="cond2", condition_level=ConditionLevel.ELEMENT)
        self.condition2 = Condition.objects.create(
            condition_dataset=self.base_condition2, raster_name="name2", is_raw=False)

        self.user = User.objects.create(username='testuser')
        self.user.set_password('12345')
        self.user.save()

        self.plan = create_plan(
            self.user, 'plan', stored_geometry, [])
        self.project = Project.objects.create(
            owner=self.user, plan=self.plan, max_budget=100)
        self.project_area = ProjectArea.objects.create(
            owner=self.user, project=self.project,
            project_area=stored_geometry, estimated_area_treated=200)
        self.scenario = Scenario.objects.create(
            owner=self.user, plan=self.plan, project=self.project, notes='my note')
        self.weight = ScenarioWeightedPriority.objects.create(
            scenario=self.scenario, priority=self.condition1, weight=2)
        self.weight2 = ScenarioWeightedPriority.objects.create(
            scenario=self.scenario, priority=self.condition2, weight=3)

    def test_get_nonexistent_scenario(self):
        response = self.client.get(
            reverse('plan:get_scenario'),
            {'id': 10},
            content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_get_scenario_does_not_belong_to_user(self):
        plan_no_user = create_plan(
            None, 'plan', None, [])
        not_owned_scenario = Scenario.objects.create(
            owner=None, plan=plan_no_user)
        self.client.force_login(self.user)
        response = self.client.get(
            reverse('plan:get_scenario'),
            {'id': not_owned_scenario.pk},
            content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_get_scenario_ok(self):
        self.client.force_login(self.user)
        response = self.client.get(
            reverse('plan:get_scenario'),
            {'id': self.scenario.pk},
            content_type="application/json")
        self.assertEqual(response.status_code, 200)
        scenario = response.json()
        self.assertEqual(scenario['owner'], self.user.pk)
        self.assertEqual(scenario['project'], self.project.pk)
        self.assertEqual(scenario['plan'], self.plan.pk)
        self.assertEqual(scenario['notes'], 'my note')
        self.assertEqual(scenario['priorities'], {
                         'cond1': 2, 'cond2': 3})
        self.assertEqual(scenario['project_areas'][str(
            self.project_area.pk)]['geometry'], self.geometry)
        self.assertEqual(scenario['project_areas'][str(
            self.project_area.pk)]['properties']['estimated_area_treated'], 200)
        self.assertEqual(scenario['config']['max_budget'], 100)


class ListScenariosTest(TransactionTestCase):
    def setUp(self):
        self.geometry = {'type': 'MultiPolygon',
                         'coordinates': [[[[1, 2], [2, 3], [3, 4], [1, 2]]]]}
        stored_geometry = GEOSGeometry(json.dumps(self.geometry))

        self.base_condition = BaseCondition.objects.create(
            condition_name="cond1", condition_level=ConditionLevel.ELEMENT)
        self.condition1 = Condition.objects.create(
            condition_dataset=self.base_condition, raster_name="name1", is_raw=False)
        self.base_condition2 = BaseCondition.objects.create(
            condition_name="cond2", condition_level=ConditionLevel.ELEMENT)
        self.condition2 = Condition.objects.create(
            condition_dataset=self.base_condition2, raster_name="name2", is_raw=False)

        self.user = User.objects.create(username='testuser')
        self.user.set_password('12345')
        self.user.save()

        self.plan = create_plan(
            self.user, 'plan', stored_geometry, [])
        self.project = Project.objects.create(
            owner=self.user, plan=self.plan, max_budget=100)
        self.project_area = ProjectArea.objects.create(
            owner=self.user, project=self.project,
            project_area=stored_geometry, estimated_area_treated=200)
        self.scenario1 = Scenario.objects.create(
            owner=self.user, plan=self.plan, project=self.project, notes='my note')
        self.weight = ScenarioWeightedPriority.objects.create(
            scenario=self.scenario1, priority=self.condition1, weight=2)
        self.weight2 = ScenarioWeightedPriority.objects.create(
            scenario=self.scenario1, priority=self.condition2, weight=3)
        self.scenario2 = Scenario.objects.create(
            owner=self.user, plan=self.plan, project=self.project, notes='my note2')
        self.weight = ScenarioWeightedPriority.objects.create(
            scenario=self.scenario2, priority=self.condition1, weight=4)
        self.weight2 = ScenarioWeightedPriority.objects.create(
            scenario=self.scenario2, priority=self.condition2, weight=5)

    def test_list_nonexistent_plan(self):
        response = self.client.get(
            reverse('plan:list_scenarios_for_plan'),
            {'plan_id': 10},
            content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_list_does_not_belong_to_user(self):
        not_owned_plan = Plan.objects.create(owner=None)
        self.client.force_login(self.user)
        response = self.client.get(
            reverse('plan:list_scenarios_for_plan'),
            {'plan_id': not_owned_plan.pk},
            content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_list_scenario_ok(self):
        self.client.force_login(self.user)
        response = self.client.get(
            reverse('plan:list_scenarios_for_plan'),
            {'plan_id': self.plan.pk},
            content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 2)

        scenario1 = response.json()[0]
        self.assertEqual(scenario1['id'], self.scenario1.pk)
        self.assertEqual(scenario1['priorities'], {
                         'cond1': 2, 'cond2': 3})
        self.assertEqual(scenario1['project_areas'][str(
            self.project_area.pk)]['geometry'], self.geometry)
        self.assertEqual(scenario1['project_areas'][str(
            self.project_area.pk)]['properties']['estimated_area_treated'], 200)
        self.assertEqual(scenario1['config']['max_budget'], 100)

        scenario2 = response.json()[1]
        self.assertEqual(scenario2['id'], self.scenario2.pk)
        self.assertEqual(scenario2['priorities'], {
                         'cond1': 4, 'cond2': 5})
        self.assertEqual(scenario2['project_areas'][str(
            self.project_area.pk)]['geometry'], self.geometry)
        self.assertEqual(scenario2['project_areas'][str(
            self.project_area.pk)]['properties']['estimated_area_treated'], 200)
        self.assertEqual(scenario2['config']['max_budget'], 100)


class DeleteScenariosTest(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create(username='testuser')
        self.user.set_password('12345')
        self.user.save()

        self.plan_with_user = Plan.objects.create(
            owner=self.user, name='with_owner', region_name='sierra_cascade_inyo')
        self.plan_with_no_user = Plan.objects.create(
            owner=None, name='without owner', region_name='sierra_cascade_inyo')

        self.project_with_user = Project.objects.create(
            owner=self.user, plan=self.plan_with_user, max_budget=100.0)
        self.project_with_no_user = Project.objects.create(
            owner=None, plan=self.plan_with_no_user, max_budget=100.0)

        self.scenario_with_user = Scenario.objects.create(
            owner=self.user, plan=self.plan_with_user, project=self.project_with_user, notes='my note')
        self.scenario_with_user2 = Scenario.objects.create(
            owner=self.user, plan=self.plan_with_user, project=self.project_with_user, notes='my note')
        self.scenario_with_no_user = Scenario.objects.create(
            owner=None, plan=self.plan_with_no_user, project=self.project_with_no_user, notes='my note2')

    def test_delete_user_not_logged_in(self):
        response = self.client.post(
            reverse('plan:delete_scenarios'), {
                'scenario_ids': [self.scenario_with_user.pk]},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Scenario.objects.all().count(), 3)

    def test_user_logged_in_tries_to_delete_ownerless_scenario(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('plan:delete_scenarios'), {
                'scenario_ids': [self.scenario_with_no_user.pk]},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Scenario.objects.count(), 3)

    def test_delete_wrong_user(self):
        new_user = User.objects.create(username='newuser')
        new_user.set_password('12345')
        new_user.save()
        self.client.force_login(new_user)
        response = self.client.post(
            reverse('plan:delete_scenarios'), {
                'scenario_ids': [self.scenario_with_user.pk]},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Scenario.objects.count(), 3)

    def test_delete_ownerless_scenario(self):
        self.assertEqual(Scenario.objects.count(), 3)
        response = self.client.post(
            reverse('plan:delete_scenarios'), {
                'scenario_ids': [self.scenario_with_no_user.pk]},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, json.dumps(
            [self.scenario_with_no_user.pk]).encode())
        self.assertEqual(Scenario.objects.count(), 2)

    def test_delete_owned_scenario(self):
        self.client.force_login(self.user)
        self.assertEqual(Scenario.objects.count(), 3)
        response = self.client.post(
            reverse('plan:delete_scenarios'), {
                'scenario_ids': [self.scenario_with_user.pk]},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, json.dumps(
            [self.scenario_with_user.pk]).encode())
        self.assertEqual(Scenario.objects.count(), 2)

    def test_delete_multiple_scenarios_fails_if_any_not_owner(self):
        self.client.force_login(self.user)
        scenario_ids = [self.scenario_with_no_user.pk,
                        self.scenario_with_user.pk]
        response = self.client.post(
            reverse('plan:delete_scenarios'), {'scenario_ids': scenario_ids},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Scenario.objects.count(), 3)

    def test_delete_multiple_scenarios(self):
        self.client.force_login(self.user)
        self.assertEqual(Scenario.objects.count(), 3)
        scenario_ids = [self.scenario_with_user.pk,
                        self.scenario_with_user2.pk]
        response = self.client.post(
            reverse('plan:delete_scenarios'), {'scenario_ids': scenario_ids},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, json.dumps(
            scenario_ids).encode())
        self.assertEqual(Scenario.objects.count(), 1)


class FavoriteScenarioTest(TransactionTestCase):
    def setUp(self):
        self.geometry = {'type': 'MultiPolygon',
                         'coordinates': [[[[1, 2], [2, 3], [3, 4], [1, 2]]]]}
        stored_geometry = GEOSGeometry(json.dumps(self.geometry))

        self.base_condition = BaseCondition.objects.create(
            condition_name="cond1", condition_level=ConditionLevel.ELEMENT)
        self.condition1 = Condition.objects.create(
            condition_dataset=self.base_condition, raster_name="name1", is_raw=False)
        self.base_condition2 = BaseCondition.objects.create(
            condition_name="cond2", condition_level=ConditionLevel.ELEMENT)
        self.condition2 = Condition.objects.create(
            condition_dataset=self.base_condition2, raster_name="name2", is_raw=False)

        self.user = User.objects.create(username='testuser')
        self.user.set_password('12345')
        self.user.save()

        self.plan = create_plan(
            self.user, 'plan', stored_geometry, [])
        self.project = Project.objects.create(
            owner=self.user, plan=self.plan, max_budget=100)
        self.project_area = ProjectArea.objects.create(
            owner=self.user, project=self.project,
            project_area=stored_geometry, estimated_area_treated=200)
        self.scenario = Scenario.objects.create(
            owner=self.user, plan=self.plan, project=self.project, notes='my note')
        self.weight = ScenarioWeightedPriority.objects.create(
            scenario=self.scenario, priority=self.condition1, weight=2)
        self.weight2 = ScenarioWeightedPriority.objects.create(
            scenario=self.scenario, priority=self.condition2, weight=3)

    def test_favorite_nonexistent_scenario(self):
        response = self.client.post(
            reverse('plan:favorite_scenario'),
            {'scenario_id': 10},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_unfavorite_nonexistent_scenario(self):
        response = self.client.post(
            reverse('plan:unfavorite_scenario'),
            {'scenario_id': 10},
            content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_favorite_scenario_does_not_belong_to_user(self):
        plan_no_user = create_plan(
            None, 'plan', None, [])
        not_owned_scenario = Scenario.objects.create(
            owner=None, plan=plan_no_user)
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('plan:favorite_scenario'),
            {'scenario_id': not_owned_scenario.pk},
            content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_unfavorite_scenario_does_not_belong_to_user(self):
        plan_no_user = create_plan(
            None, 'plan', None, [])
        not_owned_scenario = Scenario.objects.create(
            owner=None, plan=plan_no_user)
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('plan:unfavorite_scenario'),
            {'scenario_id': not_owned_scenario.pk},
            content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_favorite_scenario_ok(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('plan:favorite_scenario'),
            {'scenario_id': self.scenario.pk},
            content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['favorited'], True)
        scenario = Scenario.objects.get(pk=self.scenario.pk)
        self.assertEqual(scenario.favorited, True)

    def test_unfavorite_scenario_ok(self):
        self.client.force_login(self.user)
        favorited_scenario = Scenario.objects.create(
            owner=self.user, plan=self.plan, favorited=True)
        response = self.client.post(
            reverse('plan:unfavorite_scenario'),
            {'scenario_id': favorited_scenario.pk},
            content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['favorited'], False)
        scenario = Scenario.objects.get(pk=favorited_scenario.pk)
        self.assertEqual(scenario.favorited, False)


class BulkCreateProjectAreaTest(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create(username='testuser')
        self.user.set_password('12345')
        self.user.save()

        self.plan = Plan.objects.create(
            owner=self.user, name='plan', region_name='sierra_cascade_inyo')
        self.project = Project.objects.create(owner=self.user, plan=self.plan)

        self.plan_no_user = Plan.objects.create(
            owner=None, name='plan', region_name='sierra_cascade_inyo')
        self.project_no_user = Project.objects.create(
            owner=None, plan=self.plan_no_user)

        self.geometry1 = {'type': 'MultiPolygon',
                          'coordinates': [[[[1, 2], [2, 3], [3, 4], [1, 2]]]]}
        self.stored_geometry1 = GEOSGeometry(json.dumps(self.geometry1))

        self.geometry2 = {'type': 'MultiPolygon',
                          'coordinates': [[[[1, 2], [2, 3], [5, 6], [1, 2]]]]}
        self.stored_geometry2 = GEOSGeometry(json.dumps(self.geometry2))

        self.geometries = [
            {'features':
             [{'geometry': {
                 'type': 'Polygon',
                 'coordinates': [[[1, 2], [2, 3], [3, 4], [1, 2]]]
             }}]
             },
            {'features':
                [{'geometry': {
                    'type': 'Polygon',
                    'coordinates': [[[1, 2], [2, 3], [5, 6], [1, 2]]]
                }}]
             }
        ]

        self.multipolygon_geometries = [
            {'features':
             [{'geometry': {
                 'type': 'MultiPolygon',
                 'coordinates': [[[[1, 2], [2, 3], [3, 4], [1, 2]]]]
             }}]
             },
            {'features':
                [{'geometry': {
                    'type': 'MultiPolygon',
                    'coordinates': [[[[1, 2], [2, 3], [5, 6], [1, 2]]]]
                }}]
             }
        ]

    def test_missing_project(self):
        response = self.client.post(
            reverse('plan:create_project_areas_for_project'), {},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_missing_geometry(self):
        response = self.client.post(
            reverse('plan:create_project_areas_for_project'),
            {'project_id': self.project.pk},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_missing_features(self):
        response = self.client.post(
            reverse('plan:create_project_areas_for_project'), {
                'project_id': self.project.pk, 'geometries': []},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_empty_features(self):
        response = self.client.post(
            reverse('plan:create_project_areas_for_project'),
            {'project_id': self.project.pk, 'geometries': [{'features': []}]},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_bad_geometry(self):
        response = self.client.post(
            reverse('plan:create_project_areas_for_project'),
            {'project_id': self.project.pk, 'geometries': [{'features': [
                {'type': 'Point', 'coordinates': [1, 2]}]}]},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_bad_polygon(self):
        response = self.client.post(
            reverse('plan:create_project_areas_for_project'),
            {'project_id': self.project.pk, 'geometries': [{'features': [
                {'geometry': {'type': 'Polygon'}}]}]},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_good_polygon_wrong_user(self):
        response = self.client.post(
            reverse('plan:create_project_areas_for_project'),
            {'project_id': self.project.pk, 'geometries': self.geometries},
            content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_good_polygon(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse('plan:create_project_areas_for_project'),
            {'project_id': self.project.pk, 'geometries': self.geometries},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(ProjectArea.objects.count(), 2)

        area = ProjectArea.objects.get(id=(response.json()[0]))
        self.assertEqual(area.owner, self.user)
        self.assertEqual(area.project, self.project)
        self.assertEqual(area.project_area.coords,
                         self.stored_geometry1.coords)

        area = ProjectArea.objects.get(id=(response.json()[1]))
        self.assertEqual(area.owner, self.user)
        self.assertEqual(area.project, self.project)
        self.assertEqual(area.project_area.coords,
                         self.stored_geometry2.coords)

    def test_good_polygon_no_user(self):
        response = self.client.post(
            reverse('plan:create_project_areas_for_project'),
            {'project_id': self.project_no_user.pk, 'geometries': self.geometries},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        print(response.content)
        self.assertEqual(ProjectArea.objects.count(), 2)

        area = ProjectArea.objects.get(id=(response.json()[0]))
        self.assertEqual(area.owner, None)
        self.assertEqual(area.project, self.project_no_user)
        self.assertEqual(area.project_area.coords,
                         self.stored_geometry1.coords)

        area = ProjectArea.objects.get(id=(response.json()[1]))
        self.assertEqual(area.owner, None)
        self.assertEqual(area.project, self.project_no_user)
        self.assertEqual(area.project_area.coords,
                         self.stored_geometry2.coords)

    def test_good_multipolygon(self):
        self.client.force_login(self.user)

        response = self.client.post(
            reverse('plan:create_project_areas_for_project'),
            {'project_id': self.project.pk,
                'geometries': self.multipolygon_geometries},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(ProjectArea.objects.count(), 2)

        area = ProjectArea.objects.get(id=(response.json()[0]))
        self.assertEqual(area.owner, self.user)
        self.assertEqual(area.project, self.project)
        self.assertEqual(area.project_area.coords,
                         self.stored_geometry1.coords)

        area = ProjectArea.objects.get(id=(response.json()[1]))
        self.assertEqual(area.owner, self.user)
        self.assertEqual(area.project, self.project)
        self.assertEqual(area.project_area.coords,
                         self.stored_geometry2.coords)

    def test_good_multipolygon_no_user(self):
        response = self.client.post(
            reverse('plan:create_project_areas_for_project'),
            {'project_id': self.project_no_user.pk,
                'geometries': self.multipolygon_geometries},
            content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(ProjectArea.objects.count(), 2)

        area = ProjectArea.objects.get(id=(response.json()[0]))
        self.assertEqual(area.owner, None)
        self.assertEqual(area.project, self.project_no_user)
        self.assertEqual(area.project_area.coords,
                         self.stored_geometry1.coords)

        area = ProjectArea.objects.get(id=(response.json()[1]))
        self.assertEqual(area.owner, None)
        self.assertEqual(area.project, self.project_no_user)
        self.assertEqual(area.project_area.coords,
                         self.stored_geometry2.coords)
