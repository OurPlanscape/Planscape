import logging
import smtplib
from typing import Iterable, Optional, Tuple
from urllib.parse import urljoin

from celery import chain, chord
from django.conf import settings
from django.contrib.auth import get_user_model
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
    calculate_project_area_impacts,
    export_and_upload_geopackage,
    get_calculation_matrix,
    get_calculation_matrix_wo_action,
)
from planning.models import GeoPackageStatus
from planscape.celery import app
from planscape.analytics import track_event

User = get_user_model()
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
    stand_ids: list[int],
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
    :param stand_ids: Stand IDs in this task's batch
    :type stand_ids: list[int]
    :return: None
    """
    log.info(f"Getting already calculated impacts for {variable}")
    try:
        treatment_plan = TreatmentPlan.objects.select_related("scenario").get(
            pk=treatment_plan_pk
        )
        calculate_impacts(
            treatment_plan=treatment_plan,
            variable=variable,
            action=action,
            year=year,
            stand_ids=stand_ids,
            calculate_project_area_results=False,
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
    stand_ids: list[int],
) -> None:
    """Calculate impacts for non-treated stands for the variable, year pair.

    :param treatment_plan_pk: TreatmentPlan primary key
    :type treatment_plan_pk: int
    :param variable: ImpactVariable instance
    :type variable: ImpactVariable
    :param year: Year of calculation
    :type year: int
    :param stand_ids: Stand IDs in this task's batch
    :type stand_ids: list[int]
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
            stand_ids=stand_ids,
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
def async_calculate_project_area_impacts(treatment_plan_pk: int) -> None:
    try:
        treatment_plan = TreatmentPlan.objects.select_related("scenario").get(
            pk=treatment_plan_pk
        )
        calculate_project_area_impacts(treatment_plan)
    except TreatmentPlan.DoesNotExist:
        log.warning(
            "TreatmentPlan with pk %s does not exist or was deleted. "
            "Cannot calculate project area impacts.",
            treatment_plan_pk,
        )


def batch_stand_ids(stand_ids: Iterable[int], batch_size: int) -> list[list[int]]:
    if batch_size < 1:
        raise ValueError("IMPACTS_STAND_BATCH_SIZE must be greater than zero")

    stand_ids = list(stand_ids)
    return [
        stand_ids[index : index + batch_size]
        for index in range(0, len(stand_ids), batch_size)
    ]


@app.task()
def async_set_status(
    treatment_plan_pk: int,
    status: TreatmentPlanStatus = TreatmentPlanStatus.FAILURE,
    start: bool = False,
    user_id: Optional[int] = None,
) -> Tuple[bool, int]:
    """sets the status of a treatment plan async.
    this is used as a callback in celery canvas.
    """
    with transaction.atomic():
        user = User.objects.filter(pk=user_id).first()
        try:
            treatment_plan = TreatmentPlan.objects.select_for_update().get(
                pk=treatment_plan_pk
            )
            treatment_plan.status = status
            attr = "started_at" if start else "finished_at"
            setattr(treatment_plan, attr, timezone.now())
            treatment_plan.save()
            log.info(f"Treatment plan {treatment_plan_pk} changed status to {status}.")
            track_event(
                name="impacts.treatment_plan.status_changed",
                properties={
                    "treatment_plan": treatment_plan_pk,
                    "status": status,
                    "email": user.email if user else None,
                },
                user_id=user_id,
            )
            async_generate_treatment_plan_geopackage.delay(treatment_plan_pk)
        except TreatmentPlan.DoesNotExist:
            log.warning(
                "TreatmentPlan with pk %s does not exist or was deleted. Cannot set status.",
                treatment_plan_pk,
            )
            return (False, treatment_plan_pk)

    return (True, treatment_plan_pk)


@app.task()
def async_generate_treatment_plan_geopackage(treatment_plan_pk: int) -> str | None:
    try:
        treatment_plan = TreatmentPlan.objects.get(pk=treatment_plan_pk)
    except TreatmentPlan.DoesNotExist:
        log.warning(
            "TreatmentPlan with pk %s does not exist or was deleted. Cannot generate geopackage.",
            treatment_plan_pk,
        )
        return None
    try:
        return export_and_upload_geopackage(treatment_plan)
    except Exception:
        log.error(
            "Failed to generate Treatment Plan Geopackage",
            extra={"treatment_plan_pk": treatment_plan_pk},
        )
        return None


@app.task()
def async_calculate_persist_impacts_treatment_plan(
    treatment_plan_pk: int,
    user_id: int,
) -> None:
    # calling it this way will not be async
    async_set_status(
        treatment_plan_pk=treatment_plan_pk,
        status=TreatmentPlanStatus.RUNNING,
        start=True,
        user_id=user_id,
    )
    user = User.objects.filter(pk=user_id).first()
    treatment_plan = TreatmentPlan.objects.get(pk=treatment_plan_pk)

    calculation_matrix = get_calculation_matrix(
        treatment_plan=treatment_plan,
        years=AVAILABLE_YEARS,
    )
    untreated_stands_matrix = get_calculation_matrix_wo_action(
        years=AVAILABLE_YEARS,
    )
    stand_ids = (
        treatment_plan.get_project_areas_stands()
        .order_by("id")
        .values_list("id", flat=True)
    )
    stand_batches = batch_stand_ids(stand_ids, settings.IMPACTS_STAND_BATCH_SIZE)
    failure_callback = async_set_status.si(
        treatment_plan_pk=treatment_plan_pk,
        status=TreatmentPlanStatus.FAILURE,
        start=False,
        user_id=user_id,
    )
    completion_callback = chain(
        async_set_status.si(
            treatment_plan_pk=treatment_plan_pk,
            status=TreatmentPlanStatus.SUCCESS,
            start=False,
            user_id=user_id,
        ),
        async_send_email_process_finished.si(treatment_plan_pk=treatment_plan_pk),
    ).on_error(failure_callback)
    callback = chain(
        async_calculate_project_area_impacts.si(
            treatment_plan_pk=treatment_plan_pk,
        ),
        completion_callback,
    ).on_error(failure_callback)
    tasks = [
        async_calculate_impacts_for_variable_action_year.si(
            treatment_plan_pk=treatment_plan_pk,
            variable=variable,
            action=action,
            year=year,
            stand_ids=stand_batch,
        )
        for variable, action, year in calculation_matrix
        for stand_batch in stand_batches
    ]
    tasks += [
        async_calculate_impacts_for_non_treated_stands_action_year.si(
            treatment_plan_pk=treatment_plan_pk,
            variable=variable,
            year=year,
            stand_ids=stand_batch,
        )
        for variable, year in untreated_stands_matrix
        for stand_batch in stand_batches
    ]
    log.info(f"Firing {len(tasks)} tasks to calculate impacts!")
    TreatmentPlan.objects.filter(pk=treatment_plan_pk).update(
        geopackage_url=None,
        geopackage_status=GeoPackageStatus.PENDING,
        updated_at=timezone.now(),
    )
    if tasks:
        chord(tasks)(callback)
    else:
        completion_callback.delay()
    track_event(
        name="impacts.treatment_plan.run",
        properties={
            "treatment_plan": treatment_plan_pk,
            "email": user.email if user else None,
        },
        user_id=user_id,
    )
    log.info(f"Calculation of impacts for {treatment_plan} triggered.")


@app.task(
    bind=True,
    autoretry_for=(Exception, smtplib.SMTPDataError),
    retry_backoff=True,
    retry_jitter=True,
    retry_kwargs={"max_retries": 3},
)
def async_send_email_process_finished(self, treatment_plan_pk, *args, **kwargs):
    try:
        treatment_plan = TreatmentPlan.objects.select_related(
            "created_by", "scenario"
        ).get(pk=treatment_plan_pk)
        user = treatment_plan.created_by

        link = urljoin(
            settings.PLANSCAPE_BASE_URL,
            f"plan/{treatment_plan.scenario.planning_area_id}/"
            f"scenario/{treatment_plan.scenario.pk}/treatment/{treatment_plan_pk}/impacts",
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
    except smtplib.SMTPDataError:
        if self.request.retries >= self.max_retries:
            log.exception("Failed to send email. SMTP server side error.")
        else:
            log.warning("Failed to send email. SMTP server side error. Retrying.")
        raise
    except Exception as e:
        if self.request.retries >= self.max_retries:
            log.exception(
                "Something unexpected happened while sending the email to inform that a Treatment Plan process was finished.",
                extra={
                    "exception": e,
                    "treatment_plan": treatment_plan.pk,
                    "user": user.pk,
                },
            )
        else:
            log.warning(
                "Something unexpected happened while sending the email to inform that a Treatment Plan process was finished. Retrying.",
                extra={
                    "exception": e,
                    "treatment_plan": treatment_plan.pk,
                    "user": user.pk,
                },
            )
        raise
