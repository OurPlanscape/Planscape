from rest_framework.test import APITransactionTestCase
from rest_framework import status
from django.urls import reverse
from django.contrib.auth import get_user_model
from planning.tests.factories import ScenarioFactory
from impacts.models import TreatmentPlan

User = get_user_model()


class TxPlanVioewSetTest(APITransactionTestCase):
    def setUp(self):
        self.scenario = ScenarioFactory.create()
        self.client.force_authenticate(user=self.scenario.user)

    def test_create_tx_plan_returns_201(self):
        payload = {"scenario": str(self.scenario.uuid), "name": "my cool name"}
        response = self.client.post(
            reverse("api:impacts:tx-plans-list"),
            data=payload,
            format="json",
        )
        data = response.json()
        tx_plan = TreatmentPlan.objects.get(uuid=data.get("uuid"))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(1, TreatmentPlan.objects.all().count())
        self.assertEqual(
            data.get("created_by"),
            tx_plan.created_by.id,
        )
