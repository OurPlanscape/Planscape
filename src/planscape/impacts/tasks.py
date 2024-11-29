import logging
from typing import Tuple
from django.conf import settings
from django.db import transaction
from django.core.mail import send_mail
from django.template.loader import render_to_string
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
from planning.models import ProjectArea
from planscape.celery import app

log = logging.getLogger(__name__)


@app.task()
def async_calculate_impacts_for_variable_action_year(
    treatment_plan_pk: int,
    variable: ImpactVariable,
    action: TreatmentPrescriptionAction,
    year: int,
) -> None:
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
    calculate_impacts(
        treatment_plan=treatment_plan, variable=variable, action=action, year=year
    )


@app.task()
def async_set_status(
    treatment_plan_pk: int, status: TreatmentPlanStatus = TreatmentPlanStatus.FAILURE
) -> Tuple[bool, int]:
    """sets the status of a treatment plan async.
    this is used as a callback in celery canvas.
    """
    with transaction.atomic():
        treatment_plan = TreatmentPlan.objects.select_for_update().get(
            pk=treatment_plan_pk
        )
        treatment_plan.status = status
        treatment_plan.save()
        log.info(f"Treatment plan {treatment_plan_pk} changed status to {status}.")

    if status in [TreatmentPlanStatus.SUCCESS, TreatmentPlanStatus.FAILURE]:
        async_send_email_process_finished.delay(treatment_plan_pk=treatment_plan_pk)
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


@app.task()
def async_send_email_process_finished(treatment_plan_pk):
    treatment_plan = TreatmentPlan.objects.select_related("created_by").get(
        pk=treatment_plan_pk
    )
    user = treatment_plan.created_by

    try:
        context = {
            "user_name": user.get_full_name(),
            "treatment_plan_link": None,
        }

        subject = f"Planscape Treatment Plan is completed"

        txt = render_to_string("templates/email/treatment_plan_completed.txt", context)
        send_mail(
            subject=subject,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            message=txt,
        )
        log.info(
            "Email sent informing user that Treatment Plan %s process is finished.",
            treatment_plan.pk,
        )
    except Exception as e:
        log.exception(
            "Something unexpected happened while sending the email to inform that a Treatment Plan process was finished.",
            extra={
                "exception": e,
                "treatment_plan": treatment_plan.pk,
                "user": user.pk,
            },
        )
