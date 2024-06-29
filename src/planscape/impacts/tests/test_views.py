from rest_framework.test import APITransactionTestCase
from rest_framework import status
from django.urls import reverse
from django.contrib.auth import get_user_model
from planning.tests.factories import ScenarioFactory
from impacts.models import TreatmentPlan
from impacts.tests.factories import TreatmentPlanFactory, TreatmentPrescriptionFactory

User = get_user_model()


class TxPlanViewSetTest(APITransactionTestCase):
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


class TxPrescriptionListTest(APITransactionTestCase):
    def setUp(self):
        self.tx_plan = TreatmentPlanFactory.create()
        self.client.force_authenticate(user=self.tx_plan.scenario.user)

        self.tx_rx1 = TreatmentPrescriptionFactory.create(treatment_plan=self.tx_plan)
        self.tx_rx2 = TreatmentPrescriptionFactory.create(treatment_plan=self.tx_plan)

    def test_list_tx_rx(self):
        response = self.client.get(
            reverse(
                "api:impacts:tx-prescriptions-list",
                kwargs={"tx_plan_pk": self.tx_plan.pk},
            ),
            content_type="application/json",
        )

        data = response.json()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(data["count"], 2)
        self.assertEqual(data["results"][0]["treatment_plan"], self.tx_plan.pk)
        self.assertEqual(data["results"][1]["treatment_plan"], self.tx_plan.pk)
