import logging
from typing import Tuple
from urllib.parse import urljoin

from celery import chain, chord
from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.template.loader import render_to_string
from django.utils import timezone
from rasterio.errors import RasterioIOError

from impacts.models import (
    AVAILABLE_YEARS,
    ImpactVariable,
    TreatmentPlan,
    TreatmentPlanStatus,
    TreatmentPrescriptionAction,
)
from impacts.services import (
    calculate_impacts,
    calculate_impacts_for_untreated_stands,
    get_calculation_matrix,
    get_calculation_matrix_wo_action,
)
from planscape.celery import app
from planscape.openpanel import SingleOpenPanel

log = logging.getLogger(__name__)


@app.task(
    bind=True, autoretry_for=(OSError, RasterioIOError), retry_kwargs={"max_retries": 5}
)
def async_calculate_impacts_for_variable_action_year(
    self,
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
    try:
        treatment_plan = TreatmentPlan.objects.select_related("scenario").get(
            pk=treatment_plan_pk
        )
        calculate_impacts(
            treatment_plan=treatment_plan, variable=variable, action=action, year=year
        )
    except TreatmentPlan.DoesNotExist:
        log.warning(
            "TreatmentPlan with pk %s does not exist or was deleted. Cannot calculate impacts.",
            treatment_plan_pk,
        )
        return
    except (OSError, RasterioIOError) as exc:
        if self.request.retries >= self.max_retries:
            log.exception("Task failed on all retries.")
        else:
            log.warning("Task failed. Retrying.")
        raise exc
    except Exception as exc:
        log.exception(
            "Task failed due to an unhandled exception. Not retrying execution."
        )
        raise exc


@app.task(
    bind=True, autoretry_for=(OSError, RasterioIOError), retry_kwargs={"max_retries": 5}
)
def async_calculate_impacts_for_non_treated_stands_action_year(
    self,
    treatment_plan_pk: int,
    variable: ImpactVariable,
    year: int,
) -> None:
    """Calculate impacts for non-treated stands for the variable, year pair.

    :param treatment_plan_pk: TreatmentPlan primary key
    :type treatment_plan_pk: int
    :param variable: ImpactVariable instance
    :type variable: ImpactVariable
    :param year: Year of calculation
    :type year: int
    :return: None
    """
    log.info(f"Calculating baseline metrics for {variable} on non-treated stands")
    try:
        treatment_plan = TreatmentPlan.objects.select_related("scenario").get(
            pk=treatment_plan_pk
        )
        calculate_impacts_for_untreated_stands(
            treatment_plan=treatment_plan,
            variable=variable,
            year=year,
        )
    except TreatmentPlan.DoesNotExist:
        log.warning(
            "TreatmentPlan with pk %s does not exist or was deleted. Cannot calculate impacts.",
            treatment_plan_pk,
        )
        return
    except (OSError, RasterioIOError) as exc:
        if self.request.retries >= self.max_retries:
            log.exception("Task failed on all retries.")
        else:
            log.warning("Task failed. Retrying.")
        raise exc
    except Exception as exc:
        log.exception(
            "Task failed due to an unhandled exception. Not retrying execution."
        )
        raise exc


@app.task()
def async_set_status(
    treatment_plan_pk: int,
    status: TreatmentPlanStatus = TreatmentPlanStatus.FAILURE,
    start: bool = False,
) -> Tuple[bool, int]:
    """sets the status of a treatment plan async.
    this is used as a callback in celery canvas.
    """
    with transaction.atomic():
        try:
            treatment_plan = TreatmentPlan.objects.select_for_update().get(
                pk=treatment_plan_pk
            )
            treatment_plan.status = status
            attr = "started_at" if start else "finished_at"
            setattr(treatment_plan, attr, timezone.now())
            treatment_plan.save()
            log.info(f"Treatment plan {treatment_plan_pk} changed status to {status}.")
            SingleOpenPanel().track(
                "impacts.treatment_plan.run_finished",
                {"treatment_plan": treatment_plan_pk, "status": status},
            )
        except TreatmentPlan.DoesNotExist:
            log.warning(
                "TreatmentPlan with pk %s does not exist or was deleted. Cannot set status.",
                treatment_plan_pk,
            )
            return (False, treatment_plan_pk)

    return (True, treatment_plan_pk)


@app.task()
def async_calculate_persist_impacts_treatment_plan(
    treatment_plan_pk: int,
) -> None:
    # calling it this way will not be async
    async_set_status(
        treatment_plan_pk=treatment_plan_pk,
        status=TreatmentPlanStatus.RUNNING,
        start=True,
    )

    treatment_plan = TreatmentPlan.objects.get(pk=treatment_plan_pk)

    calculation_matrix = get_calculation_matrix(
        treatment_plan=treatment_plan,
        years=AVAILABLE_YEARS,
    )
    untreated_stands_matrix = get_calculation_matrix_wo_action(
        years=AVAILABLE_YEARS,
    )
    callback = chain(
        async_set_status.si(
            treatment_plan_pk=treatment_plan_pk,
            status=TreatmentPlanStatus.SUCCESS,
            start=False,
        ),
        async_send_email_process_finished.si(treatment_plan_pk=treatment_plan_pk),
    ).on_error(
        async_set_status.si(
            treatment_plan_pk=treatment_plan_pk,
            status=TreatmentPlanStatus.FAILURE,
            start=False,
        )
    )
    tasks = [
        async_calculate_impacts_for_variable_action_year.si(
            treatment_plan_pk=treatment_plan_pk,
            variable=variable,
            action=action,
            year=year,
        )
        for variable, action, year in calculation_matrix
    ]
    tasks += [
        async_calculate_impacts_for_non_treated_stands_action_year.si(
            treatment_plan_pk=treatment_plan_pk,
            variable=variable,
            year=year,
        )
        for variable, year in untreated_stands_matrix
    ]
    log.info(f"Firing {len(tasks)} tasks to calculate impacts!")
    chord(tasks)(callback)
    SingleOpenPanel().track(
        "impacts.treatment_plan.run",
        {
            "treatment_plan": treatment_plan_pk,
        },
    )
    log.info(f"Calculation of impacts for {treatment_plan} triggered.")


@app.task()
def async_send_email_process_finished(treatment_plan_pk, *args, **kwargs):
    try:
        treatment_plan = TreatmentPlan.objects.select_related(
            "created_by", "scenario"
        ).get(pk=treatment_plan_pk)
        user = treatment_plan.created_by

        link = urljoin(
            settings.PLANSCAPE_BASE_URL,
            f"plan/{treatment_plan.scenario.planning_area_id}/"
            f"config/{treatment_plan.scenario.pk}/treatment/{treatment_plan_pk}/impacts",
        )

        context = {
            "user_full_name": user.get_full_name(),
            "treatment_plan_link": link,
        }

        subject = "Planscape Treatment Plan is completed"

        txt = render_to_string(
            "email/treatment_plan/treatment_plan_completed.txt", context
        )
        html = render_to_string(
            "email/treatment_plan/treatment_plan_completed.html", context
        )

        send_mail(
            subject=subject,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            message=txt,
            html_message=html,
        )
        log.info(
            "Email sent informing user that Treatment Plan %s process is finished.",
            treatment_plan.pk,
        )
    except TreatmentPlan.DoesNotExist:
        log.warning(
            "TreatmentPlan with pk %s does not exist or was deleted. Cannot send email.",
            treatment_plan_pk,
        )
        return
    except Exception as e:
        log.exception(
            "Something unexpected happened while sending the email to inform that a Treatment Plan process was finished.",
            extra={
                "exception": e,
                "treatment_plan": treatment_plan.pk,
                "user": user.pk,
            },
        )
