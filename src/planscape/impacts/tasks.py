import logging
from django.db import transaction
from celery import chord
from impacts.models import (
    AVAILABLE_YEARS,
    ImpactVariable,
    TreatmentPlanStatus,
    TreatmentPrescriptionAction,
    TreatmentPlan,
)
from impacts.services import calculate_impacts, persist_impacts, get_calculation_matrix
from planscape.celery import app

log = logging.getLogger(__name__)


@app.task()
def async_calculate_persist_impacts(
    treament_plan_pk: int,
    variable: ImpactVariable,
    action: TreatmentPrescriptionAction,
    year: int,
) -> None:
    pass


@app.task()
def async_set_success(treatment_plan_pk: int):
    treatment_plan = TreatmentPlan.objects.select_for_update().get(pk=treatment_plan_pk)
    with transaction.atomic():
        treatment_plan.status = TreatmentPlanStatus.SUCCESS
        treatment_plan.save()
        log.info(f"Treatment plan {treatment_plan_pk} FAILED.")
    return (True, treatment_plan_pk)


@app.task()
def async_set_failure(treatment_plan_pk: int):
    treatment_plan = TreatmentPlan.objects.select_for_update().get(pk=treatment_plan_pk)
    with transaction.atomic():
        treatment_plan.status = TreatmentPlanStatus.FAILURE
        treatment_plan.save()
        log.info(f"Treatment plan {treatment_plan_pk} FAILED.")

    return (False, treatment_plan_pk)


@app.task()
def async_calculate_persist_impacts_treament_plan(treatment_plan_pk: int) -> None:
    treatment_plan = TreatmentPlan.objects.select_for_update().get(pk=treatment_plan_pk)
    with transaction.atomic():
        treatment_plan.status = TreatmentPlanStatus.RUNNING
        treatment_plan.save()
        log.info(f"Running treatment plan {treatment_plan_pk}.")

    matrix = get_calculation_matrix(
        treatment_plan=treatment_plan,
        years=AVAILABLE_YEARS,
    )
    callback = async_set_success.s(treatment_plan_pk=treatment_plan_pk).on_error(
        async_set_failure.s(treatment_plan_pk=treatment_plan_pk)
    )
    tasks = [
        async_calculate_persist_impacts.si(
            treatment_plan_pk=treatment_plan_pk,
            variable=variable,
            action=action,
            year=year,
        )
        for variable, action, year in matrix
    ]
    result = chord(tasks)(callback)
