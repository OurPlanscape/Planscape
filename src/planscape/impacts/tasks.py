import logging
from typing import List, Tuple
from django.db import transaction
from celery import chord
from impacts.models import (
    AVAILABLE_YEARS,
    ImpactVariable,
    TreatmentPlanStatus,
    TreatmentPrescriptionAction,
    TreatmentPlan,
)
from impacts.services import (
    calculate_impacts,
    get_calculation_matrix,
)
from planscape.celery import app

log = logging.getLogger(__name__)


@app.task()
def async_calculate_impacts_for_variable_action_year(
    treatment_plan_pk: int,
    variable: ImpactVariable,
    action: TreatmentPrescriptionAction,
    year: int,
) -> List[int]:
    """Calculates impacts for the variable, action year triple.

    :param treatment_plan_pk: _description_
    :type treatment_plan_pk: int
    :param variable: _description_
    :type variable: ImpactVariable
    :param action: _description_
    :type action: TreatmentPrescriptionAction
    :param year: _description_
    :type year: int
    :return: _description_
    :rtype: List[int]
    """
    log.info(f"Getting already calculated impacts for {variable}")
    treatment_plan = TreatmentPlan.objects.select_related("scenario").get(
        pk=treatment_plan_pk
    )
    results = calculate_impacts(
        treatment_plan=treatment_plan, variable=variable, action=action, year=year
    )
    return list([x.id for x in results])


@app.task()
def async_set_status(
    treatment_plan_pk: int, status: TreatmentPlanStatus = TreatmentPlanStatus.FAILURE
) -> Tuple[bool, int]:
    with transaction.atomic():
        treatment_plan = TreatmentPlan.objects.select_for_update().get(
            pk=treatment_plan_pk
        )
        treatment_plan.status = status
        treatment_plan.save()
        log.info(f"Treatment plan {treatment_plan_pk} changed status to {status}.")
    return (True, treatment_plan_pk)


@app.task()
def async_calculate_persist_impacts_treatment_plan(
    treatment_plan_pk: int,
) -> None:
    # calling it this way will not be async
    async_set_status(
        treatment_plan_pk=treatment_plan_pk,
        status=TreatmentPlanStatus.RUNNING,
    )

    treatment_plan = TreatmentPlan.objects.get(pk=treatment_plan_pk)

    matrix = get_calculation_matrix(
        treatment_plan=treatment_plan,
        years=AVAILABLE_YEARS,
    )
    callback = async_set_status.si(
        treatment_plan_pk=treatment_plan_pk, status=TreatmentPlanStatus.SUCCESS
    ).on_error(
        async_set_status.si(
            treatment_plan_pk=treatment_plan_pk,
            status=TreatmentPlanStatus.FAILURE,
        )
    )
    tasks = [
        async_calculate_impacts_for_variable_action_year.si(
            treatment_plan_pk=treatment_plan_pk,
            variable=variable,
            action=action,
            year=year,
        )
        for variable, action, year in matrix
    ]
    log.info(f"Firing {len(tasks)} tasks to calculate impacts!")
    chord(tasks)(callback)
    log.info(f"Calculation of impacts for {treatment_plan} triggered.")
