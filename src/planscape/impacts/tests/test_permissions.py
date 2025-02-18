from django.test import TestCase

from collaboration.models import Role, UserObjectRole
from collaboration.services import get_content_type
from impacts.tests.factories import TreatmentPlanFactory
from impacts.permissions import TreatmentPlanPermission
from planscape.tests.factories import UserFactory


class TreatmentPlanPermissionTest(TestCase):
    def test_creator_can_do_anything(self):
        tx_plan = TreatmentPlanFactory.create()
        user = tx_plan.scenario.user
        # just make sure the factory behavior is coherent
        self.assertEqual(tx_plan.created_by, user)
        TreatmentPlanPermission.can_add(user, tx_plan.scenario)
        TreatmentPlanPermission.can_run(user, tx_plan)
        TreatmentPlanPermission.can_view(user, tx_plan)
        TreatmentPlanPermission.can_change(user, tx_plan)
        TreatmentPlanPermission.can_clone(user, tx_plan)
        TreatmentPlanPermission.can_remove(user, tx_plan)

    def test_user_with_owner_can_do_anything(self):
        tx_plan = TreatmentPlanFactory.create()
        user = UserFactory.create()

        self.assertFalse(TreatmentPlanPermission.can_add(user, tx_plan.scenario))
        self.assertFalse(TreatmentPlanPermission.can_run(user, tx_plan))
        self.assertFalse(TreatmentPlanPermission.can_view(user, tx_plan))
        self.assertFalse(TreatmentPlanPermission.can_change(user, tx_plan))
        self.assertFalse(TreatmentPlanPermission.can_clone(user, tx_plan))
        self.assertFalse(TreatmentPlanPermission.can_remove(user, tx_plan))

        user_role = UserObjectRole.objects.create(
            email=tx_plan.scenario.user.email,
            inviter=tx_plan.scenario.user,
            collaborator=user,
            role=Role.OWNER,
            content_type=get_content_type("PlanningArea"),
            object_pk=tx_plan.scenario.planning_area.pk,
        )
        self.assertIsNotNone(user_role)
        self.assertTrue(TreatmentPlanPermission.can_add(user, tx_plan.scenario))
        self.assertTrue(TreatmentPlanPermission.can_run(user, tx_plan))  ###
        self.assertTrue(TreatmentPlanPermission.can_view(user, tx_plan))
        self.assertTrue(TreatmentPlanPermission.can_change(user, tx_plan))
        self.assertTrue(TreatmentPlanPermission.can_clone(user, tx_plan))
        self.assertTrue(TreatmentPlanPermission.can_remove(user, tx_plan))
        self.assertTrue(TreatmentPlanPermission.can_run(user, tx_plan))

    def test_user_with_viewer_can_only_view(self):
        tx_plan = TreatmentPlanFactory.create()
        user = UserFactory.create()

        self.assertFalse(TreatmentPlanPermission.can_add(user, tx_plan.scenario))
        self.assertFalse(TreatmentPlanPermission.can_run(user, tx_plan))
        self.assertFalse(TreatmentPlanPermission.can_view(user, tx_plan))
        self.assertFalse(TreatmentPlanPermission.can_change(user, tx_plan))
        self.assertFalse(TreatmentPlanPermission.can_clone(user, tx_plan))
        self.assertFalse(TreatmentPlanPermission.can_remove(user, tx_plan))
        user_role = UserObjectRole.objects.create(
            email=tx_plan.scenario.user.email,
            inviter=tx_plan.scenario.user,
            collaborator=user,
            role=Role.VIEWER,
            content_type=get_content_type("PlanningArea"),
            object_pk=tx_plan.scenario.planning_area.pk,
        )
        self.assertIsNotNone(user_role)
        self.assertTrue(TreatmentPlanPermission.can_view(user, tx_plan))
        self.assertFalse(TreatmentPlanPermission.can_run(user, tx_plan))
        self.assertFalse(TreatmentPlanPermission.can_add(user, tx_plan.scenario))
        self.assertFalse(TreatmentPlanPermission.can_change(user, tx_plan))
        self.assertFalse(TreatmentPlanPermission.can_clone(user, tx_plan))
        self.assertFalse(TreatmentPlanPermission.can_remove(user, tx_plan))

    def test_user_with_collab_cannot_run(self):
        tx_plan = TreatmentPlanFactory.create()
        user = UserFactory.create()

        self.assertFalse(TreatmentPlanPermission.can_add(user, tx_plan.scenario))
        self.assertFalse(TreatmentPlanPermission.can_run(user, tx_plan))
        self.assertFalse(TreatmentPlanPermission.can_view(user, tx_plan))
        self.assertFalse(TreatmentPlanPermission.can_change(user, tx_plan))
        self.assertFalse(TreatmentPlanPermission.can_clone(user, tx_plan))
        self.assertFalse(TreatmentPlanPermission.can_remove(user, tx_plan))

        user_role = UserObjectRole.objects.create(
            email=tx_plan.scenario.user.email,
            inviter=tx_plan.scenario.user,
            collaborator=user,
            role=Role.COLLABORATOR,
            content_type=get_content_type("PlanningArea"),
            object_pk=tx_plan.scenario.planning_area.pk,
        )
        self.assertIsNotNone(user_role)
        self.assertFalse(TreatmentPlanPermission.can_run(user, tx_plan))
        self.assertTrue(TreatmentPlanPermission.can_view(user, tx_plan))
        self.assertTrue(TreatmentPlanPermission.can_add(user, tx_plan.scenario))
        self.assertTrue(TreatmentPlanPermission.can_change(user, tx_plan))
        self.assertTrue(TreatmentPlanPermission.can_clone(user, tx_plan))
        self.assertTrue(TreatmentPlanPermission.can_remove(user, tx_plan))

    def test_user_with_collab_that_created_tx_plan_can_run(self):
        user = UserFactory.create()
        tx_plan = TreatmentPlanFactory.create(created_by=user)

        self.assertTrue(TreatmentPlanPermission.can_run(user, tx_plan))
        user_role = UserObjectRole.objects.create(
            email=tx_plan.scenario.user.email,
            inviter=tx_plan.scenario.user,
            collaborator=user,
            role=Role.COLLABORATOR,
            content_type=get_content_type("PlanningArea"),
            object_pk=tx_plan.scenario.planning_area.pk,
        )
        self.assertIsNotNone(user_role)
        self.assertTrue(TreatmentPlanPermission.can_run(user, tx_plan))
