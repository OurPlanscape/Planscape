import json
from unittest import mock
from urllib.parse import urlencode

from collaboration.models import Permissions, Role, UserObjectRole
from collaboration.services import get_content_type
from datasets.models import DataLayerType
from datasets.tests.factories import DataLayerFactory
from django.contrib.auth import get_user_model
from django.forms.models import model_to_dict
from django.urls import reverse
from django.utils import timezone
from impacts.models import (
    AVAILABLE_YEARS,
    ImpactVariable,
    ImpactVariableAggregation,
    TreatmentPlan,
    TreatmentPlanNote,
    TreatmentPlanStatus,
    TreatmentPrescriptionAction,
)
from impacts.tests.factories import (
    ImpactVariable,
    ProjectAreaTreatmentResultFactory,
    TreatmentPlanFactory,
    TreatmentPrescriptionFactory,
    TreatmentResultFactory,
)
from planning.tests.factories import (
    PlanningAreaFactory,
    ProjectAreaFactory,
    ScenarioFactory,
)
from rest_framework import status
from rest_framework.test import APIClient, APITestCase, APITransactionTestCase
from stands.models import StandSizeChoices
from stands.tests.factories import StandFactory, StandMetricFactory

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
        self.assertIsNone(response.get("started_at"))
        self.assertIsNone(response.get("finished_at"))
        self.assertIsNone(response.get("elapsed_time_seconds"))

    def test_get_tx_plan_with_elapsed_time(self):
        self.client.force_authenticate(user=self.scenario.user)
        now = timezone.now()
        started_at = now - timezone.timedelta(seconds=10)

        tx_plan = TreatmentPlanFactory.create(
            scenario=self.scenario,
            name="it's a bold plan",
            started_at=started_at,
            finished_at=now,
        )
        response = self.client.get(
            reverse("api:impacts:tx-plans-detail", kwargs={"pk": tx_plan.pk}),
            content_type="application/json",
        )
        response_data = response.json()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response_data.get("name"), "it's a bold plan")
        self.assertEqual(
            response_data.get("started_at"), started_at.strftime("%Y-%m-%dT%H:%M:%SZ")
        )
        self.assertEqual(
            response_data.get("finished_at"), now.strftime("%Y-%m-%dT%H:%M:%SZ")
        )
        self.assertEqual(response_data.get("elapsed_time_seconds"), 10)

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


class TxPlanViewSetPlotTest(APITransactionTestCase):
    def setUp(self):
        self.user = UserFactory.create()
        self.planning_area = PlanningAreaFactory.create(user=self.user)
        self.scenario = ScenarioFactory.create(
            planning_area=self.planning_area,
            configuration={"stand_size": StandSizeChoices.SMALL},
        )
        self.project_areas = [
            ProjectAreaFactory.create(scenario=self.scenario),
            ProjectAreaFactory.create(scenario=self.scenario),
            ProjectAreaFactory.create(scenario=self.scenario),
        ]
        self.tx_plan = TreatmentPlanFactory.create(
            scenario=self.scenario, created_by=self.user
        )
        self.empty_tx_plan = TreatmentPlanFactory.create(
            scenario=self.scenario, created_by=self.user
        )
        self.client.force_authenticate(user=self.user)
        self.years = AVAILABLE_YEARS
        self.patxrx_list = []
        for pa in self.project_areas:
            for variable in ImpactVariable.choices:
                for year in self.years:
                    ProjectAreaTreatmentResultFactory(
                        project_area=pa,
                        treatment_plan=self.tx_plan,
                        variable=variable[0],
                        year=year,
                        aggregation=ImpactVariableAggregation.MEAN,
                        action=TreatmentPrescriptionAction.MODERATE_THINNING_BIOMASS,
                    )
        self.someone_elses_tx_plan = TreatmentPlanFactory.create()

    def _build_filters(self, variables=[], project_areas=[], actions=[]):
        filters = []
        for variable in variables:
            filters.append(("variables", variable))

        for pa in project_areas:
            filters.append(("project_areas", pa))

        for action in actions:
            filters.append(("actions", action))

        return filters

    def test_treatment_results(self):
        variables = [
            ImpactVariable.TOTAL_CARBON.value,
            ImpactVariable.FLAME_LENGTH.value,
            ImpactVariable.RATE_OF_SPREAD.value,
            ImpactVariable.PROBABILITY_TORCHING.value,
        ]
        filter = self._build_filters(variables=variables)
        url = f"{reverse('api:impacts:tx-plans-plot', kwargs={'pk': self.tx_plan.pk})}?{urlencode(filter)}"
        response = self.client.get(
            url,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.json()
        self.assertIsNotNone(response_data)
        self.assertEqual(len(response_data), len(self.years) * 4)
        for item in response_data:
            self.assertIn(item.get("year"), self.years)
            self.assertIn(item.get("variable"), variables)
            self.assertIsNotNone(item.get("value"))

    def test_empty_tx_plan(self):
        variables = [
            ImpactVariable.TOTAL_CARBON.value,
            ImpactVariable.FLAME_LENGTH.value,
            ImpactVariable.RATE_OF_SPREAD.value,
            ImpactVariable.PROBABILITY_TORCHING.value,
        ]
        filter = self._build_filters(variables=variables)
        url = f"{reverse('api:impacts:tx-plans-plot', kwargs={'pk': self.empty_tx_plan.pk})}?{urlencode(filter)}"
        response = self.client.get(
            url,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.json()
        self.assertEqual(response_data, [])

    def test_filter_by_project_areas(self):
        pa_pks = [project_area.pk for project_area in self.project_areas]
        pa_pks.pop(0)
        pa_pks.sort()

        variables = [
            ImpactVariable.TOTAL_CARBON.value,
            ImpactVariable.FLAME_LENGTH.value,
            ImpactVariable.RATE_OF_SPREAD.value,
            ImpactVariable.PROBABILITY_TORCHING.value,
        ]
        filter = self._build_filters(variables=variables, project_areas=pa_pks)

        url = f"{reverse('api:impacts:tx-plans-plot', kwargs={'pk': self.tx_plan.pk})}?{urlencode(filter)}"
        response = self.client.get(
            url,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.json()
        self.assertIsNotNone(response_data)
        self.assertEqual(len(response_data), len(self.years) * 4)
        for item in response_data:
            self.assertIn(item.get("year"), self.years)
            self.assertIn(item.get("variable"), variables)
            self.assertIsNotNone(item.get("value"))

    def test_filter_by_actions(self):
        variables = [
            ImpactVariable.TOTAL_CARBON.value,
            ImpactVariable.FLAME_LENGTH.value,
            ImpactVariable.RATE_OF_SPREAD.value,
            ImpactVariable.PROBABILITY_TORCHING.value,
        ]
        filter = self._build_filters(
            variables=variables,
            actions=[TreatmentPrescriptionAction.MODERATE_THINNING_BIOMASS.value],
        )
        url = f"{reverse('api:impacts:tx-plans-plot', kwargs={'pk': self.tx_plan.pk})}?{urlencode(filter)}"
        response = self.client.get(
            url,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.json()
        self.assertIsNotNone(response_data)
        self.assertEqual(len(response_data), len(self.years) * 4)
        for item in response_data:
            self.assertIn(item.get("year"), self.years)
            self.assertIn(item.get("variable"), variables)
            self.assertIsNotNone(item.get("value"))

    def test_filter_by_not_applied_actions(self):
        variables = [
            ImpactVariable.TOTAL_CARBON.value,
            ImpactVariable.FLAME_LENGTH.value,
            ImpactVariable.RATE_OF_SPREAD.value,
            ImpactVariable.PROBABILITY_TORCHING.value,
        ]
        filter = self._build_filters(
            variables=variables,
            actions=[TreatmentPrescriptionAction.HEAVY_MASTICATION.value],
        )
        url = f"{reverse('api:impacts:tx-plans-plot', kwargs={'pk': self.tx_plan.pk})}?{urlencode(filter)}"
        response = self.client.get(
            url,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.json()
        self.assertEqual(response_data, [])

    def test_someone_elses_tx_plan(self):
        variables = [
            ImpactVariable.TOTAL_CARBON.value,
            ImpactVariable.FLAME_LENGTH.value,
            ImpactVariable.RATE_OF_SPREAD.value,
            ImpactVariable.PROBABILITY_TORCHING.value,
        ]
        filter = self._build_filters(variables=variables)
        url = f"{reverse('api:impacts:tx-plans-plot', kwargs={'pk': self.someone_elses_tx_plan.pk})}?{urlencode(filter)}"
        response = self.client.get(
            url,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


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


class StandTreatmentResultsViewTest(APITestCase):
    def setUp(self):
        self.user = UserFactory()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.scenario = ScenarioFactory.create(planning_area__user=self.user)

        self.treatment_plan = TreatmentPlanFactory(
            scenario=self.scenario, created_by=self.user
        )

        self.stand = StandFactory()
        self.url = reverse(
            "api:impacts:tx-plans-stand-treatment-results",
            kwargs={"pk": self.treatment_plan.pk},
        )

    def test_no_results_returns_empty_list(self):
        """
        Ensures the endpoint returns a 200 with [] if there’s no data for stand_id.
        """
        response = self.client.get(f"{self.url}?stand_id={self.stand.pk}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), [])

    def test_multiple_results(self):
        """
        Tests that the endpoint returns correct data when multiple TreatmentResult rows exist.
        """
        TreatmentResultFactory.create(
            treatment_plan=self.treatment_plan,
            stand=self.stand,
            variable=ImpactVariable.LARGE_TREE_BIOMASS,
            year=2024,
            value=80.0,
            delta=10.0,
            baseline=70.0,
            forested_rate=1,
            action=None,
            aggregation=ImpactVariableAggregation.MEAN,
        )

        TreatmentResultFactory.create(
            treatment_plan=self.treatment_plan,
            stand=self.stand,
            variable=ImpactVariable.LARGE_TREE_BIOMASS,
            year=2024,
            value=105.0,
            delta=12.0,
            baseline=45.0,
            forested_rate=1,
            action=None,
            aggregation=ImpactVariableAggregation.SUM,
        )

        for year in AVAILABLE_YEARS:
            biomass_meta = {
                "modules": {
                    "impacts": {
                        "year": year,
                        "baseline": True,
                        "variable": ImpactVariable.LARGE_TREE_BIOMASS,
                        "action": None,
                    }
                }
            }
            biomass_layer = DataLayerFactory.create(
                name=f"biomass_layer_{year}",
                url="impacts/tests/test_data/test_raster.tif",
                metadata=biomass_meta,
                type=DataLayerType.RASTER,
            )
            StandMetricFactory.create(
                stand=self.stand,
                datalayer=biomass_layer,
                avg=70.0,
            )

            flame_length_meta = {
                "modules": {
                    "impacts": {
                        "year": year,
                        "variable": ImpactVariable.FLAME_LENGTH,
                        "action": None,
                        "baseline": True,
                    }
                }
            }
            fl_layer = DataLayerFactory.create(
                name=f"flame_length_{year}",
                url="impacts/tests/test_data/test_raster.tif",
                metadata=flame_length_meta,
                type=DataLayerType.RASTER,
            )
            StandMetricFactory.create(
                stand=self.stand,
                datalayer=fl_layer,
                avg=4.5,
            )

            ros_meta = {
                "modules": {
                    "impacts": {
                        "year": year,
                        "variable": ImpactVariable.RATE_OF_SPREAD,
                        "action": None,
                        "baseline": True,
                    }
                }
            }
            ros_layer = DataLayerFactory.create(
                name=f"rate_of_spread_{year}",
                url="impacts/tests/test_data/test_raster.tif",
                metadata=ros_meta,
                type=DataLayerType.RASTER,
            )
            StandMetricFactory.create(
                stand=self.stand,
                datalayer=ros_layer,
                avg=12.0,
            )

        response = self.client.get(f"{self.url}?stand_id={self.stand.pk}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(
            len(data),
            1,
            f"Expected {len(AVAILABLE_YEARS)} rows (one for each year).",
        )

        first_year = data[0]
        self.assertEqual(first_year.get("year"), 2024)

        biomass = first_year.get(ImpactVariable.LARGE_TREE_BIOMASS)
        self.assertIsNotNone(biomass)

        self.assertIsNotNone(biomass.get("value"))
        self.assertIsNotNone(biomass.get("delta"))
        self.assertIsNotNone(biomass.get("baseline"))
        self.assertIsNotNone(biomass.get("forested_rate"))

    def test_missing_stand_id(self):
        """
        If 'stand_id' param is missing, the serializer should raise a 400 error.
        """
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_stand_id(self):
        """
        If 'stand_id' doesn't exist in DB, we expect a 400 from the PrimaryKeyRelatedField.
        """
        response = self.client.get(f"{self.url}?stand_id=99999999")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class TxPlanNoteTest(APITransactionTestCase):
    def setUp(self):
        self.user = UserFactory()
        self.other_user = UserFactory()

        # explicitly creating these objects, so same user is planningarea creator
        self.planning_area = PlanningAreaFactory.create(user=self.user)

        self.scenario = ScenarioFactory.create(planning_area=self.planning_area)
        self.treatment_plan = TreatmentPlanFactory.create(
            created_by=self.user, scenario=self.scenario
        )
        self.other_user_treatment_plan = TreatmentPlanFactory.create(
            created_by_id=self.other_user.pk, scenario=self.scenario
        )

    def test_create_note(self):
        self.client.force_authenticate(self.user)
        new_note = json.dumps(
            {
                "content": "Here is a note about a treatment plan.",
            }
        )
        response = self.client.post(
            reverse(
                "api:impacts:tx-plan-notes-list",
                kwargs={"tx_plan_pk": self.treatment_plan.pk},
            ),
            new_note,
            content_type="application/json",
        )
        response_data = response.json()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            response_data["content"], "Here is a note about a treatment plan."
        )

    def test_create_note_without_permission(self):
        self.client.force_authenticate(self.other_user)
        new_note = json.dumps(
            {
                "content": "Here is a note about a treatment area.",
                "treatment_plan": self.treatment_plan.pk,
            }
        )
        response = self.client.post(
            reverse(
                "api:impacts:tx-plan-notes-list",
                kwargs={"tx_plan_pk": self.treatment_plan.pk},
            ),
            new_note,
            content_type="application/json",
        )
        print(f"what is the respone? {response}")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_notes_for_treatment_plan(self):
        self.client.force_authenticate(self.user)
        TreatmentPlanNote.objects.create(
            treatment_plan=self.treatment_plan, user=self.user, content="I am a note"
        )
        TreatmentPlanNote.objects.create(
            treatment_plan=self.treatment_plan,
            user=self.user,
            content="I am a second note",
        )
        TreatmentPlanNote.objects.create(
            treatment_plan=self.treatment_plan,
            user=self.other_user,
            content="I am a third note",
        )
        TreatmentPlanNote.objects.create(
            treatment_plan=self.treatment_plan,
            user=self.other_user,
            content="I am a third note",
        )
        # create a note for a different treatment plan
        TreatmentPlanNote.objects.create(
            treatment_plan=self.other_user_treatment_plan,
            user=self.other_user,
            content="I am a new note on a different tx plan",
        )
        response = self.client.get(
            reverse(
                "api:impacts:tx-plan-notes-list",
                kwargs={"tx_plan_pk": self.treatment_plan.pk},
            ),
            content_type="application/json",
        )
        response_data = response.json()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_data), 4)
        for rec in response_data:
            self.assertIn("can_delete", rec)
            self.assertEqual(rec["can_delete"], True)

    def test_get_notes_for_unauthorized_user(self):
        self.client.force_authenticate(self.other_user)
        TreatmentPlanNote.objects.create(
            treatment_plan=self.treatment_plan, user=self.user, content="I am a note"
        )
        TreatmentPlanNote.objects.create(
            treatment_plan=self.treatment_plan,
            user=self.user,
            content="I am a second note",
        )
        response = self.client.get(
            reverse(
                "api:impacts:tx-plan-notes-list",
                kwargs={"tx_plan_pk": self.treatment_plan.pk},
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_single_note(self):
        self.client.force_authenticate(self.user)
        visible_note = TreatmentPlanNote.objects.create(
            treatment_plan=self.treatment_plan,
            user=self.user,
            content="I am just one note",
        )
        response = self.client.get(
            reverse(
                "api:impacts:tx-plan-notes-detail",
                kwargs={"tx_plan_pk": self.treatment_plan.pk, "pk": visible_note.pk},
            ),
            content_type="application/json",
        )
        response_data = response.json()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response_data["content"], "I am just one note")

    def test_get_single_note_no_perms(self):
        self.client.force_authenticate(self.other_user)
        visible_note = TreatmentPlanNote.objects.create(
            treatment_plan=self.treatment_plan, user=self.user, content="A note"
        )

        response = self.client.get(
            reverse(
                "api:impacts:tx-plan-notes-detail",
                kwargs={"tx_plan_pk": self.treatment_plan.pk, "pk": visible_note.pk},
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_note(self):
        self.client.force_authenticate(self.user)
        new_note = TreatmentPlanNote.objects.create(
            treatment_plan=self.treatment_plan, user=self.user
        )
        response = self.client.delete(
            reverse(
                "api:impacts:tx-plan-notes-detail",
                kwargs={"tx_plan_pk": self.treatment_plan.pk, "pk": new_note.pk},
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_delete_nonexistent_note(self):
        self.client.force_authenticate(self.user)
        new_note = TreatmentPlanNote.objects.create(
            treatment_plan=self.treatment_plan, user=self.user
        )
        response = self.client.delete(
            reverse(
                "api:impacts:tx-plan-notes-detail",
                kwargs={
                    "tx_plan_pk": self.treatment_plan.pk,
                    "pk": (new_note.pk + 1),
                },
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_note_no_permissions(self):
        self.client.force_authenticate(self.other_user)
        new_note = TreatmentPlanNote.objects.create(
            treatment_plan=self.treatment_plan, user=self.user
        )
        response = self.client.delete(
            reverse(
                "api:impacts:tx-plan-notes-detail",
                kwargs={
                    "tx_plan_pk": self.treatment_plan.pk,
                    "pk": new_note.pk,
                },
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
