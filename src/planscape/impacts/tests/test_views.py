from rest_framework.test import APITransactionTestCase
from rest_framework import status
from django.urls import reverse
from django.contrib.auth import get_user_model
from impacts.models import TreatmentPlan
from impacts.tests.factories import TreatmentPlanFactory, TreatmentPrescriptionFactory
from planning.tests.factories import ScenarioFactory, PlanningAreaFactory
from planscape.tests.factories import UserFactory

User = get_user_model()


class TxPlanViewSetTest(APITransactionTestCase):
    def setUp(self):
        self.scenario = ScenarioFactory.create()

    def test_create_tx_plan_returns_201(self):
        self.client.force_authenticate(user=self.scenario.user)
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

    def test_get_tx_plan(self):
        self.client.force_authenticate(user=self.scenario.user)

        tx_plan = TreatmentPlanFactory.create(
            name="it's a bold plan",
        )
        response = self.client.get(
            reverse("api:impacts:tx-plans-detail", kwargs={"pk": tx_plan.pk}),
            content_type="application/json",
        )
        response_data = response.json()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response_data["name"], "it's a bold plan")

    def test_update_tx_plan(self):
        self.client.force_authenticate(user=self.scenario.user)

        tx_plan = TreatmentPlanFactory.create(name="it's a bold plan")
        payload = {"name": "lets see how it works out"}
        response = self.client.patch(
            reverse("api:impacts:tx-plans-detail", kwargs={"pk": tx_plan.pk}),
            payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        updated_plan = TreatmentPlan.objects.get(pk=tx_plan.id)
        self.assertEqual(updated_plan.name, "lets see how it works out")

    def test_list_txplans_in_scenario(self):
        for _ in range(50):
            TreatmentPlanFactory.create(scenario=self.scenario)
        self.client.force_authenticate(user=self.scenario.user)
        response = self.client.get(
            reverse(
                "planning:scenarios-treatment-plans",
                kwargs={
                    "planningarea_pk": self.scenario.planning_area.pk,
                    "pk": self.scenario.pk,
                },
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.json()
        self.assertEqual(response_data["count"], 50)
        self.assertEqual(len(response_data["results"]), 50)

    # test pagination
    def test_txplans_pagination(self):
        for _ in range(50):
            TreatmentPlanFactory.create(scenario=self.scenario)
        self.client.force_authenticate(user=self.scenario.user)

        query_string = {"limit": 10, "offset": 48}
        response = self.client.get(
            reverse(
                "planning:scenarios-treatment-plans",
                kwargs={
                    "planningarea_pk": self.scenario.planning_area.pk,
                    "pk": self.scenario.pk,
                },
            ),
            query_string,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        paged_data = response.json()
        self.assertEqual(paged_data["count"], 50)
        self.assertIn("next", paged_data)
        self.assertIn("http", paged_data["previous"])
        self.assertEqual(len(paged_data["results"]), 2)

    def test_tx_plans_auth(self):
        other_user = UserFactory()
        for _ in range(50):
            TreatmentPlanFactory.create(scenario=self.scenario)
        self.client.force_authenticate(user=other_user)
        response = self.client.get(
            reverse(
                "planning:scenarios-treatment-plans",
                kwargs={
                    "planningarea_pk": self.scenario.planning_area.pk,
                    "pk": self.scenario.pk,
                },
            ),
            content_type="application/json",
        )
        response_data = response.json()
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


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
