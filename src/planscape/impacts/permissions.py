from collaboration.permissions import CheckPermissionMixin
from collaboration.utils import check_for_permission, is_creator
from django.shortcuts import get_object_or_404
from impacts.models import TreatmentPlan

from planscape.permissions import PlanscapePermission
from planscape.typing import UserType
from planning.models import ScenarioType


class TreatmentPlanPermission(CheckPermissionMixin):
    @staticmethod
    def can_view(user: UserType, tx_plan: TreatmentPlan):
        if is_creator(user, tx_plan.scenario.planning_area):
            return True

        return check_for_permission(
            user.id, tx_plan.scenario.planning_area, "view_tx_plan"
        )

    @staticmethod
    def can_add(user: UserType, scenario: ScenarioType):
        if is_creator(user, scenario.planning_area):
            return True

        return check_for_permission(user.id, scenario.planning_area, "add_tx_plan")

    @staticmethod
    def can_change(user: UserType, tx_plan: TreatmentPlan):
        if (
            is_creator(user, tx_plan.scenario.planning_area)
            or tx_plan.created_by.pk == user.pk
        ):
            return True

        return check_for_permission(
            user.id, tx_plan.scenario.planning_area, "edit_tx_plan"
        )

    @staticmethod
    def can_remove(user: UserType, tx_plan: TreatmentPlan):
        return (
            is_creator(user, tx_plan.scenario.planning_area)
            or tx_plan.created_by.pk == user.pk
        )

    @staticmethod
    def can_clone(user: UserType, tx_plan: TreatmentPlan):
        return is_creator(user, tx_plan.scenario.planning_area) or check_for_permission(
            user,
            tx_plan.scenario.planning_area,
            "clone_tx_plan",
        )


class TreatmentPlanViewPermission(PlanscapePermission):
    permission_set = TreatmentPlanPermission

    def has_object_permission(self, request, view, object):
        match view.action:
            case "delete":
                return TreatmentPlanPermission.can_remove(request.user, object)
            case "clone":
                return TreatmentPlanPermission.can_clone(request.user, object)
            case "retrieve":
                return TreatmentPlanPermission.can_view(request.user, object)
            case _:
                return TreatmentPlanPermission.can_change(request.user, object)


class TreatmentPrescriptionViewPermission(PlanscapePermission):
    permission_set = TreatmentPlanPermission

    def has_permission(self, request, view):
        tx_plan_pk = view.kwargs.get("tx_plan_pk")
        tx_plan = get_object_or_404(TreatmentPlan, id=tx_plan_pk)
        match view.action:
            case "create":
                return TreatmentPlanPermission.can_add_scenario(request.user, tx_plan)
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
