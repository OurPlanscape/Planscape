from django.test import TransactionTestCase

from impacts.tests.factories import TreatmentPlanFactory
from impacts.permissions import TreatmentPlanPermission


class TreatmentPlanPermissionTest(TransactionTestCase):
    def test_creator_can_do_anything(self):
        tx_plan = TreatmentPlanFactory.create()
        user = tx_plan.scenario.user
        # just make sure the factory behavior is coherent
        self.assertEqual(tx_plan.created_by, user)
        TreatmentPlanPermission.can_add(user, tx_plan.scenario)
        TreatmentPlanPermission.can_view(user, tx_plan)
        TreatmentPlanPermission.can_change(user, tx_plan)
        TreatmentPlanPermission.can_clone(user, tx_plan)
        TreatmentPlanPermission.can_remove(user, tx_plan)
