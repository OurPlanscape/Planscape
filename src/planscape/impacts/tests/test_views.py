from rest_framework.test import APITransactionTestCase
from rest_framework import status
from django.forms.models import model_to_dict
from django.urls import reverse
from django.contrib.auth import get_user_model
from collaboration.models import Permissions, Role, UserObjectRole
from collaboration.services import get_content_type
from impacts.models import TreatmentPlan
from impacts.tests.factories import TreatmentPlanFactory, TreatmentPrescriptionFactory
from planning.tests.factories import ScenarioFactory
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
            scenario=self.scenario,
            name="it's a bold plan",
        )
        response = self.client.get(
            reverse("api:impacts:tx-plans-detail", kwargs={"pk": tx_plan.pk}),
            content_type="application/json",
        )
        response_data = response.json()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response_data["name"], "it's a bold plan")

    def test_get_tx_plan_with_role(self):
        self.client.force_authenticate(user=self.scenario.user)
        tx_plan = TreatmentPlanFactory.create(
            name="it's a bold plan",
        )
        _ = Permissions.objects.create(role=Role.OWNER, permission="view_tx_plan")
        _ = UserObjectRole.objects.create(
            email=self.scenario.user.email,
            inviter=tx_plan.scenario.user,
            collaborator=self.scenario.user,
            role=Role.OWNER,
            content_type=get_content_type("PlanningArea"),
            object_pk=tx_plan.scenario.planning_area.pk,
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

        tx_plan = TreatmentPlanFactory.create(
            name="it's a bold plan", scenario=self.scenario
        )
        payload = {"name": "lets see how it works out"}
        response = self.client.patch(
            reverse("api:impacts:tx-plans-detail", kwargs={"pk": tx_plan.pk}),
            payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        updated_plan = TreatmentPlan.objects.get(pk=tx_plan.id)
        self.assertEqual(updated_plan.name, "lets see how it works out")

    def test_update_tx_plan_with_role(self):
        self.client.force_authenticate(user=self.scenario.user)
        tx_plan = TreatmentPlanFactory.create(name="it's a bold plan")
        _ = Permissions.objects.create(role=Role.OWNER, permission="edit_tx_plan")
        _ = UserObjectRole.objects.create(
            email=self.scenario.user.email,
            inviter=tx_plan.scenario.user,
            collaborator=self.scenario.user,
            role=Role.OWNER,
            content_type=get_content_type("PlanningArea"),
            object_pk=tx_plan.scenario.planning_area.pk,
        )

        payload = {"name": "lets see how it works out"}
        response = self.client.patch(
            reverse("api:impacts:tx-plans-detail", kwargs={"pk": tx_plan.pk}),
            payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        updated_plan = TreatmentPlan.objects.get(pk=tx_plan.id)
        self.assertEqual(updated_plan.name, "lets see how it works out")

    def test_update_tx_plan_restrict_fields(self):
        orig_scenario = ScenarioFactory()
        self.client.force_authenticate(user=orig_scenario.user)
        other_user = UserFactory(username="otheruser")
        new_scenario = ScenarioFactory()
        tx_plan = TreatmentPlanFactory.create(
            name="it's a bold plan", scenario=orig_scenario
        )

        payload = {"created_by_id": other_user.pk, "scenario": new_scenario.pk}
        response = self.client.patch(
            reverse("api:impacts:tx-plans-detail", kwargs={"pk": tx_plan.pk}),
            payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        updated_plan = TreatmentPlan.objects.get(pk=tx_plan.id)
        self.assertNotEqual(updated_plan.created_by, other_user)
        self.assertNotEqual(updated_plan.scenario.pk, new_scenario.pk)

    def test_update_tx_plan_restrict_fields_with_role(self):
        self.client.force_authenticate(user=self.scenario.user)
        orig_scenario = ScenarioFactory()
        other_user = UserFactory(username="otheruser")
        new_scenario = ScenarioFactory()
        tx_plan = TreatmentPlanFactory.create(
            name="it's a bold plan", scenario=orig_scenario
        )
        _ = Permissions.objects.create(role=Role.OWNER, permission="edit_tx_plan")
        _ = UserObjectRole.objects.create(
            email=self.scenario.user.email,
            inviter=tx_plan.scenario.user,
            collaborator=self.scenario.user,
            role=Role.OWNER,
            content_type=get_content_type("PlanningArea"),
            object_pk=tx_plan.scenario.planning_area.pk,
        )

        payload = {"created_by_id": other_user.pk, "scenario": new_scenario.pk}
        response = self.client.patch(
            reverse("api:impacts:tx-plans-detail", kwargs={"pk": tx_plan.pk}),
            payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        updated_plan = TreatmentPlan.objects.get(pk=tx_plan.id)
        self.assertNotEqual(updated_plan.created_by, other_user)
        self.assertNotEqual(updated_plan.scenario.pk, new_scenario.pk)

    def test_put_tx_plan_restrict_fields(self):
        orig_scenario = ScenarioFactory()
        self.client.force_authenticate(user=orig_scenario.user)
        other_user = UserFactory(username="otheruser")
        new_scenario = ScenarioFactory()
        tx_plan = TreatmentPlanFactory.create(
            name="it's a bold plan", scenario=orig_scenario
        )

        tx_plan.name = "ok new name"
        tx_plan.scenario = new_scenario
        tx_plan.created_by = other_user
        plan_dict = model_to_dict(tx_plan)

        response = self.client.put(
            reverse("api:impacts:tx-plans-detail", kwargs={"pk": tx_plan.pk}),
            data=plan_dict,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        updated_plan = TreatmentPlan.objects.get(pk=tx_plan.id)
        self.assertEqual(updated_plan.name, "ok new name")
        self.assertNotEqual(updated_plan.created_by, other_user)
        self.assertNotEqual(updated_plan.scenario.pk, new_scenario.pk)


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
