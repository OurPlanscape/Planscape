from collaboration.models import Role
from collaboration.permissions import CheckPermissionMixin
from collaboration.utils import check_for_permission, is_creator
from django.shortcuts import get_object_or_404
from impacts.models import TreatmentPlan, TreatmentPlanNote
from planning.models import Scenario
from planscape.permissions import PlanscapePermission
from django.contrib.auth.models import AbstractUser

VIEWER_PERMISSIONS = [
    "view_planningarea",
    "view_scenario",
    "view_tx_plan",
]
COLLABORATOR_PERMISSIONS = VIEWER_PERMISSIONS + [
    "add_scenario",
    "add_tx_plan",
    "clone_tx_plan",
    "edit_tx_plan",
    "remove_tx_plan",
    "add_tx_prescription",
    "remove_tx_prescription",
]
OWNER_PERMISSIONS = COLLABORATOR_PERMISSIONS + [
    "change_scenario",
    "view_collaborator",
    "add_collaborator",
    "delete_collaborator",
    "change_collaborator",
    "run_tx",
]
PERMISSIONS = {
    Role.OWNER: OWNER_PERMISSIONS,
    Role.COLLABORATOR: COLLABORATOR_PERMISSIONS,
    Role.VIEWER: VIEWER_PERMISSIONS,
}


class TreatmentPlanPermission(CheckPermissionMixin):
    @staticmethod
    def can_view(user: AbstractUser, tx_plan: TreatmentPlan):
        if is_creator(user, tx_plan.scenario.planning_area):
            return True

        return check_for_permission(
            user.id, tx_plan.scenario.planning_area, "view_tx_plan"
        )

    @staticmethod
    def can_add(user: AbstractUser, scenario: Scenario):
        if is_creator(user, scenario.planning_area):
            return True

        return check_for_permission(user.id, scenario.planning_area, "add_tx_plan")

    @staticmethod
    def can_change(user: AbstractUser, tx_plan: TreatmentPlan):
        if (
            is_creator(user, tx_plan.scenario.planning_area)
            or tx_plan.created_by.pk == user.pk
        ):
            return True

        return check_for_permission(
            user.id, tx_plan.scenario.planning_area, "edit_tx_plan"
        )

    @staticmethod
    def can_remove(user: AbstractUser, tx_plan: TreatmentPlan) -> bool:
        if is_creator(user, tx_plan.scenario.planning_area):
            return True

        if tx_plan.created_by.pk == user.pk:
            return True

        return check_for_permission(
            user.id,
            tx_plan.scenario.planning_area,
            "remove_tx_plan",
        )

    @staticmethod
    def can_clone(user: AbstractUser, tx_plan: TreatmentPlan) -> bool:
        return is_creator(user, tx_plan.scenario.planning_area) or check_for_permission(
            user,
            tx_plan.scenario.planning_area,
            "clone_tx_plan",
        )

    @staticmethod
    def can_run(user: AbstractUser, tx_plan: TreatmentPlan):
        is_creator_pa = is_creator(user, tx_plan.scenario.planning_area)
        is_creator_tx = tx_plan.created_by.pk == user.pk
        has_perm = check_for_permission(
            user.pk, tx_plan.scenario.planning_area, "run_tx"
        )
        return any([is_creator_pa, is_creator_tx, has_perm])


class TreatmentPlanViewPermission(PlanscapePermission):
    permission_set = TreatmentPlanPermission

    def has_object_permission(self, request, view, object):
        match view.action:
            case "delete":
                return TreatmentPlanPermission.can_remove(request.user, object)
            case "clone":
                return TreatmentPlanPermission.can_clone(request.user, object)
            case "retrieve" | "summary":
                return TreatmentPlanPermission.can_view(request.user, object)
            case _:
                return TreatmentPlanPermission.can_change(request.user, object)

    def has_permission(self, request, view):
        match view.action:
            case "create":
                scenario_pk = request.data.get("scenario", 0)
                scenario = get_object_or_404(Scenario, id=scenario_pk)
                return TreatmentPlanPermission.can_add(
                    request.user,
                    scenario,
                )
            case _:
                return super().has_permission(request, view)


class TreatmentPrescriptionViewPermission(PlanscapePermission):
    permission_set = TreatmentPlanPermission

    def has_permission(self, request, view):
        tx_plan_pk = view.kwargs.get("tx_plan_pk")
        tx_plan = get_object_or_404(TreatmentPlan, id=tx_plan_pk)
        match view.action:
            case "create":
                return TreatmentPlanPermission.can_change(
                    request.user,
                    tx_plan,
                )
            case "batch_delete":
                return TreatmentPlanPermission.can_remove(request.user, tx_plan)
            case _:
                return TreatmentPlanPermission.can_view(request.user, tx_plan)

    def has_object_permission(self, request, view, object):
        match view.action:
            case "delete":
                return TreatmentPlanPermission.can_remove(
                    request.user, object.treatment_plan
                )
            case _:
                return TreatmentPlanPermission.can_change(
                    request.user, object.treatment_plan
                )

class TreatmentPlanNotePermission(CheckPermissionMixin):
    def has_permission(self, request, view):
        match view.action:
            case "create":
                scenario_pk = request.data.get("scenario", 0)
                scenario = get_object_or_404(Scenario, id=scenario_pk)
                return TreatmentPlanPermission.can_add(
                    request.user,
                    scenario,
                )
            case _:
                return super().has_permission(request, view)

    @staticmethod
    def can_view(user: AbstractUser, treatment_plan_note: TreatmentPlanNote):
        # depends on planning_area view permission
        planning_area = treatment_plan.scenario.planning_area
        if is_creator(user, planning_area):
            return True
        return check_for_permission(user.id, planning_area, "view_planningarea")

    @staticmethod
    def can_add(user: AbstractUser, treatment_plan: TreatmentPlan):
        planning_area = treatment_plan.scenario.planning_area
        if is_creator(user, planning_area):
            return True
        return check_for_permission(user.id, planning_area, "view_planningarea")

    @staticmethod
    def can_remove(user: AbstractUser, treatment_plan_note: TreatmentPlanNote):
        planning_area = treatment_plan_note.treatment_plan.scenario.planning_area
        return is_creator(user, planning_area) or is_creator(user, treatment_plan_note)