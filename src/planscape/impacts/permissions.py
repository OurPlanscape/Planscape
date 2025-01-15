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


class TreatmentPlanNoteViewPermission(PlanscapePermission):
    permission_set = TreatmentPlanPermission

    def has_permission(self, request, view):
        if not self.is_authenticated(request):
            return False

        treatment_plan_id = view.kwargs.get("tx_plan_pk")

        match view.action:
            case "create":
                if not treatment_plan_id:
                    return False
                try:
                    treatment_plan = TreatmentPlan.objects.get(id=treatment_plan_id)
                except TreatmentPlan.DoesNotExist:
                    return False
                return TreatmentPlanNotePermission.can_add(request.user, treatment_plan)

            case "list":
                if not treatment_plan_id:
                    raise ValidationError(f"Missing required treatment_plan_id")
                try:
                    treatment_plan = TreatmentPlan.objects.select_related(
                        "scenario", "scenario__planning_area"
                    ).get(id=treatment_plan_id)
                    return TreatmentPlanPermission.can_view(
                        request.user, treatment_plan
                    )
                except TreatmentPlan.DoesNotExist:
                    return False

            case "destroy" | "retrieve":
                # fallthrough to has_object_permissions
                return True

            case "update" | "partial_update" | _:
                return False  # operations unsupported

    def has_object_permission(self, request, view, object):
        match view.action:
            case "destroy":
                method = TreatmentPlanNotePermission.can_remove
            case _:
                method = TreatmentPlanNotePermission.can_view
        return method(request.user, object)


class TreatmentPlanNotePermission(CheckPermissionMixin):
    @staticmethod
    def can_view(user: AbstractUser, treatment_plan_note: TreatmentPlanNote):
        # depends on planning_area view permission
        planning_area = treatment_plan_note.treatment_plan.scenario.planning_area
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
