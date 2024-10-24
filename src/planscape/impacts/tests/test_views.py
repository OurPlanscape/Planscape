from unittest import mock
from rest_framework.test import APITransactionTestCase
from rest_framework import status
from django.forms.models import model_to_dict
from django.urls import reverse
from django.contrib.auth import get_user_model
from collaboration.models import Permissions, Role, UserObjectRole
from collaboration.services import get_content_type
from impacts.models import TreatmentPlan, TreatmentPlanStatus
from impacts.tests.factories import (
    TreatmentPlanFactory,
    TreatmentPrescriptionFactory,
)
from planning.tests.factories import ScenarioFactory
from planscape.tests.factories import UserFactory

User = get_user_model()


class TxPlanViewSetTest(APITransactionTestCase):
    def setUp(self):
        self.scenario = ScenarioFactory.create()

    def test_create_tx_plan_returns_201(self):
        self.client.force_authenticate(user=self.scenario.user)
        payload = {"scenario": str(self.scenario.pk), "name": "my cool name"}
        response = self.client.post(
            reverse("api:impacts:tx-plans-list"),
            data=payload,
            format="json",
        )
        data = response.json()
        tx_plan = TreatmentPlan.objects.get(id=data.get("id"))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(1, TreatmentPlan.objects.all().count())
        self.assertEqual(
            data.get("created_by"),
            tx_plan.created_by.id,
        )

    def test_create_tx_plan_with_role_returns_201(self):
        collaborator = UserFactory()
        self.client.force_authenticate(user=collaborator)

        _ = Permissions.objects.create(role=Role.COLLABORATOR, permission="add_tx_plan")
        _ = UserObjectRole.objects.create(
            email=collaborator.email,
            inviter=self.scenario.user,
            collaborator=collaborator,
            role=Role.COLLABORATOR,
            content_type=get_content_type("PlanningArea"),
            object_pk=self.scenario.planning_area.pk,
        )

        payload = {"scenario": str(self.scenario.pk), "name": "my cool name"}
        response = self.client.post(
            reverse("api:impacts:tx-plans-list"),
            data=payload,
            format="json",
        )
        data = response.json()
        tx_plan = TreatmentPlan.objects.get(id=data.get("id"))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(1, TreatmentPlan.objects.all().count())
        self.assertEqual(
            data.get("created_by"),
            tx_plan.created_by.id,
        )

    def test_create_tx_plan_with_role_returns_403(self):
        viewer = UserFactory()
        self.client.force_authenticate(user=viewer)

        _ = Permissions.objects.create(role=Role.VIEWER, permission="view_tx_plan")
        _ = UserObjectRole.objects.create(
            email=viewer.email,
            inviter=self.scenario.user,
            collaborator=viewer,
            role=Role.VIEWER,
            content_type=get_content_type("PlanningArea"),
            object_pk=self.scenario.planning_area.pk,
        )

        payload = {"scenario": str(self.scenario.pk), "name": "my cool name"}
        response = self.client.post(
            reverse("api:impacts:tx-plans-list"),
            data=payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(0, TreatmentPlan.objects.all().count())

    @mock.patch(
        "impacts.views.async_calculate_persist_impacts_treatment_plan.delay",
        return_value=None,
    )
    def test_run_tx_plan_returns_202(self, async_task):
        self.client.force_authenticate(user=self.scenario.user)
        treatment_plan = TreatmentPlanFactory.create(scenario=self.scenario)
        response = self.client.post(
            reverse("api:impacts:tx-plans-run", kwargs={"pk": treatment_plan.pk}),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertTrue(async_task.called)

    @mock.patch(
        "impacts.views.async_calculate_persist_impacts_treatment_plan.delay",
        return_value=None,
    )
    def test_run_tx_plan_returns_400(self, async_task):
        self.client.force_authenticate(user=self.scenario.user)
        treatment_plan = TreatmentPlanFactory.create(scenario=self.scenario)
        treatment_plan.status = TreatmentPlanStatus.SUCCESS
        treatment_plan.save()
        response = self.client.post(
            reverse("api:impacts:tx-plans-run", kwargs={"pk": treatment_plan.pk}),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(async_task.called)

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


class TxPrescriptionBatchDeleteTest(APITransactionTestCase):
    def setUp(self):
        self.tx_plan = TreatmentPlanFactory.create()
        self.alt_tx_plan = TreatmentPlanFactory.create()
        self.client.force_authenticate(user=self.tx_plan.scenario.user)
        self.txrx_owned_list = TreatmentPrescriptionFactory.create_batch(
            10, treatment_plan=self.tx_plan
        )
        # plans for a different user
        self.txrx_other_list = TreatmentPrescriptionFactory.create_batch(
            10, treatment_plan=self.alt_tx_plan
        )

    def test_batch_delete_tx_rx(self):
        payload = {"stand_ids": [txrx.stand_id for txrx in self.txrx_owned_list]}
        response = self.client.post(
            reverse(
                "api:impacts:tx-prescriptions-delete-prescriptions",
                kwargs={"tx_plan_pk": self.tx_plan.pk},
            ),
            data=payload,
            format="json",
        )
        response_data = response.json()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response_data["result"][0], 10)

    def test_batch_delete_tx_rx_bad_values(self):
        payload = {"stand_ids": [None]}
        response = self.client.post(
            reverse(
                "api:impacts:tx-prescriptions-delete-prescriptions",
                kwargs={"tx_plan_pk": self.tx_plan.pk},
            ),
            data=payload,
            format="json",
        )
        response_data = response.json()
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_batch_delete_tx_rx_empty_list(self):
        payload = {"stand_ids": []}
        response = self.client.post(
            reverse(
                "api:impacts:tx-prescriptions-delete-prescriptions",
                kwargs={"tx_plan_pk": self.tx_plan.pk},
            ),
            data=payload,
            format="json",
        )
        response_data = response.json()
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_batch_delete_nonowned_tx_rx(self):
        payload = {"stand_ids": [txrx.stand_id for txrx in self.txrx_other_list]}
        response = self.client.post(
            reverse(
                "api:impacts:tx-prescriptions-delete-prescriptions",
                kwargs={"tx_plan_pk": self.alt_tx_plan.pk},
            ),
            data=payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # Testing a request to delete various stand_ids for some txrx records don't match the treatment plan id
    # current behavior is to only delete items matching the given tx_plan and quietly ignore the rest
    def test_batch_delete_mixed_tx_rx(self):
        owned_ids = [txrx.stand_id for txrx in self.txrx_owned_list]
        other_ids = [txrx.stand_id for txrx in self.txrx_other_list]

        payload = {"stand_ids": owned_ids + other_ids}
        response = self.client.post(
            reverse(
                "api:impacts:tx-prescriptions-delete-prescriptions",
                kwargs={"tx_plan_pk": self.tx_plan.pk},
            ),
            data=payload,
            format="json",
        )
        response_data = response.json()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response_data["result"][0], 10)
