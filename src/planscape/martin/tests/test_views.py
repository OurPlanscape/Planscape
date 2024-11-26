from rest_framework.test import APITransactionTestCase
from rest_framework import status
from planscape.tests.factories import UserFactory
from planning.tests.factories import ScenarioFactory, PlanningAreaFactory
from impacts.tests.factories import TreatmentPlanFactory

class MartinAuthTest(APITransactionTestCase):
    def setUp(self):
        self.user = UserFactory()
        self.planning_area = PlanningAreaFactory.create(user=self.user)
        self.scenario = ScenarioFactory.create(planning_area=self.planning_area, user=self.user)
        self.tx_plan = TreatmentPlanFactory.create(scenario=self.scenario, created_by=self.user)

    def test_user_has_access_with_planning_area(self):
        pass

    def test_user_has_access_with_treatment_plan(self):
        pass

    def test_user_has_access_with_scenario(self):
        pass
    
    def test_user_forbidden_with_planning_area(self):
        pass

    def test_user_forbidden_with_treatment_plan(self):
        pass

    def test_user_forbidden_with_scenario(self):
        pass
    
    def test_not_authenticated(self):
        pass

    def test_empty_query_params(self):
        pass

    