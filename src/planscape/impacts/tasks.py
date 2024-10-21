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
    persist_impacts,
    get_calculation_matrix,
    clone_existing_results,
)
from planscape.celery import app

log = logging.getLogger(__name__)


@app.task()
def async_get_or_calculate_persist_impacts(
    treatment_plan_pk: int,
    variable: ImpactVariable,
    action: TreatmentPrescriptionAction,
    year: int,
) -> List[int]:
    log.info(f"Getting already calculated impacts for {variable}")
    treatment_plan = TreatmentPlan.objects.select_related("scenario").get(
        pk=treatment_plan_pk
    )
    copied_results = clone_existing_results(
        treatment_plan=treatment_plan, variable=variable, action=action, year=year
    )

    log.info(f"Calculating impacts for {variable}")
    zonal_stats = calculate_impacts(
        treatment_plan=treatment_plan,
        variable=variable,
        action=action,
        year=year,
    )

    log.info(f"Merging impacts for {variable}")
    calculated_results = persist_impacts(
        zonal_statistics=zonal_stats, variable=variable, year=year
    )

    results = copied_results + calculated_results
    return list([x.pk for x in results])


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
) -> Tuple[bool, int]:
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
        async_get_or_calculate_persist_impacts.si(
            treatment_plan_pk=treatment_plan_pk,
            variable=variable,
            action=action,
            year=year,
        )
        for variable, action, year in matrix
    ]
    log.info(f"Firing {len(tasks)} tasks to calculate impacts!")
    async_result = chord(tasks)(callback)
    succedeed_huh, treatment_plan = async_result.get()
    log.info(f"Impacts calculated for {treatment_plan} returned {succedeed_huh}.")
    return succedeed_huh, treatment_plan
