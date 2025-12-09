"""
Orchestration service for Climate Foresight analysis pipeline.

This module coordinates the full analysis workflow:
1. Normalize all input data layers
2. Rollup pillars (aggregate normalized layers by pillar)
3. Rollup landscape (aggregate pillar rollups + future climate)
4. Run PROMOTe analysis (generate MPAT outputs)
"""

import logging
from typing import Any, Dict

from celery import chain, group
from datasets.models import DataLayerStatus
from datasets.tasks import datalayer_uploaded
from django.db import transaction
from planning.models import GeoPackageStatus

from climate_foresight.models import (
    ClimateForesightLandscapeRollup,
    ClimateForesightLandscapeRollupStatus,
    ClimateForesightPillarRollup,
    ClimateForesightPillarRollupStatus,
    ClimateForesightPromote,
    ClimateForesightPromoteStatus,
    ClimateForesightRun,
    ClimateForesightRunStatus,
    InputDataLayerStatus,
)
from climate_foresight.tasks import (
    async_generate_climate_foresight_geopackage,
    auto_progress_climate_foresight_run,
    normalize_climate_foresight_input_layer,
    process_landscape_datalayers,
    process_promote_datalayers,
    rollup_climate_foresight_landscape,
    rollup_climate_foresight_pillar,
    run_climate_foresight_promote,
)

log = logging.getLogger(__name__)


def start_climate_foresight_analysis(run_id: int) -> Dict[str, Any]:
    """
    Start the full Climate Foresight analysis pipeline.

    This orchestrates the entire workflow:
    1. Normalize all input layers
    2. Create pillar rollup records and start rollup tasks
    3. Create landscape rollup record (will run after pillars complete)
    4. Create PROMOTe record (will run after landscape completes)

    The actual execution is async via Celery tasks.

    Args:
        run_id: ID of the ClimateForesightRun to analyze

    Returns:
        dict: Summary of what was started

    Raises:
        ValueError: If run is not in DRAFT status or validation fails
    """
    run = ClimateForesightRun.objects.select_related("planning_area").get(pk=run_id)

    if run.status != ClimateForesightRunStatus.DRAFT:
        raise ValueError(
            f"Run {run_id} is not in DRAFT status. Current status: {run.status}"
        )

    layers_without_favor_high = run.input_datalayers.filter(favor_high__isnull=True)
    if layers_without_favor_high.exists():
        raise ValueError(
            f"All input layers must have favorability (favor_high) set. "
            f"Found {layers_without_favor_high.count()} layers without it."
        )

    log.info(f"Starting Climate Foresight analysis for run {run_id}")

    with transaction.atomic():
        run.status = ClimateForesightRunStatus.RUNNING
        run.save()

        normalization_tasks = []
        input_layers = run.input_datalayers.select_related("datalayer").all()

        for input_layer in input_layers:
            if input_layer.status in [
                InputDataLayerStatus.COMPLETED,
                InputDataLayerStatus.RUNNING,
            ]:
                log.info(
                    f"Input layer {input_layer.id} status is {input_layer.status}, skipping"
                )
                continue

            normalize_chain = chain(
                normalize_climate_foresight_input_layer.si(input_layer.id),
                datalayer_uploaded.s(status=DataLayerStatus.READY),
                auto_progress_climate_foresight_run.si(run_id),
            )
            normalization_tasks.append(normalize_chain)

        if normalization_tasks:
            log.info(f"Starting {len(normalization_tasks)} normalization tasks")
            group(*normalization_tasks).apply_async()

        assigned_pillars = (
            run.input_datalayers.values_list("pillar_id", flat=True)
            .distinct()
            .exclude(pillar_id__isnull=True)
        )

        pillar_rollup_ids = []
        for pillar_id in assigned_pillars:
            existing_rollup = run.pillar_rollups.filter(pillar_id=pillar_id).first()
            if existing_rollup:
                log.info(
                    f"Pillar rollup for pillar {pillar_id} already exists: {existing_rollup.id}"
                )
                pillar_rollup_ids.append(existing_rollup.id)
                continue

            pillar_rollup = ClimateForesightPillarRollup.objects.create(
                run=run,
                pillar_id=pillar_id,
                status=ClimateForesightPillarRollupStatus.PENDING,
            )
            pillar_rollup_ids.append(pillar_rollup.id)
            log.info(f"Created pillar rollup {pillar_rollup.id} for pillar {pillar_id}")

        landscape_rollup, created = (
            ClimateForesightLandscapeRollup.objects.get_or_create(
                run=run,
                defaults={"status": ClimateForesightLandscapeRollupStatus.PENDING},
            )
        )
        if created:
            log.info(f"Created landscape rollup {landscape_rollup.id}")
        else:
            log.info(f"Landscape rollup {landscape_rollup.id} already exists")

        promote, created = ClimateForesightPromote.objects.get_or_create(
            run=run,
            defaults={"status": ClimateForesightPromoteStatus.PENDING},
        )
        if created:
            log.info(f"Created PROMOTe record {promote.id}")
        else:
            log.info(f"PROMOTe record {promote.id} already exists")

    return {
        "run_id": run_id,
        "status": "started",
        "normalization_tasks": len(normalization_tasks),
        "pillar_rollups_created": pillar_rollup_ids,
        "landscape_rollup_id": landscape_rollup.id,
        "promote_id": promote.id,
    }


def trigger_pillar_rollups_if_ready(run_id: int) -> Dict[str, Any]:
    """
    Check if any pillar rollups are ready to run and trigger them.

    A pillar rollup is ready when all its input layers are normalized.

    Args:
        run_id: ID of the ClimateForesightRun

    Returns:
        dict: Summary of pillar rollups triggered
    """
    run = ClimateForesightRun.objects.get(pk=run_id)
    triggered_pillars = []

    pending_rollups = run.pillar_rollups.filter(
        status=ClimateForesightPillarRollupStatus.PENDING
    ).select_related("pillar")

    for pillar_rollup in pending_rollups:
        pillar_layers = run.input_datalayers.filter(pillar=pillar_rollup.pillar)
        incomplete_count = pillar_layers.exclude(
            status=InputDataLayerStatus.COMPLETED
        ).count()

        if incomplete_count == 0:
            log.info(
                f"Triggering pillar rollup {pillar_rollup.id} for pillar {pillar_rollup.pillar.name}"
            )

            rollup_chain = chain(
                rollup_climate_foresight_pillar.si(pillar_rollup.id),
                datalayer_uploaded.s(status=DataLayerStatus.READY),
                auto_progress_climate_foresight_run.si(run_id),
            )
            rollup_chain.apply_async()
            triggered_pillars.append(
                {
                    "pillar_rollup_id": pillar_rollup.id,
                    "pillar_name": pillar_rollup.pillar.name,
                }
            )
        else:
            log.info(
                f"Pillar rollup {pillar_rollup.id} waiting for {incomplete_count} layers to complete"
            )

    return {"run_id": run_id, "triggered_pillars": triggered_pillars}


def trigger_landscape_rollup_if_ready(run_id: int) -> Dict[str, Any]:
    """
    Check if landscape rollup is ready to run and trigger it.

    Landscape rollup is ready when all pillar rollups are completed.

    Args:
        run_id: ID of the ClimateForesightRun

    Returns:
        dict: Summary of landscape rollup status
    """
    run = ClimateForesightRun.objects.get(pk=run_id)

    try:
        landscape_rollup = run.landscape_rollup
    except ClimateForesightLandscapeRollup.DoesNotExist:
        return {"run_id": run_id, "status": "no_landscape_rollup"}

    if landscape_rollup.status != ClimateForesightLandscapeRollupStatus.PENDING:
        return {
            "run_id": run_id,
            "status": "already_processing",
            "landscape_status": landscape_rollup.status,
        }

    if run.all_pillars_rolled_up():
        log.info(f"Triggering landscape rollup {landscape_rollup.id}")

        landscape_chain = chain(
            rollup_climate_foresight_landscape.si(landscape_rollup.id),
            process_landscape_datalayers.s(),
            auto_progress_climate_foresight_run.si(run_id),
        )
        landscape_chain.apply_async()

        return {
            "run_id": run_id,
            "status": "triggered",
            "landscape_rollup_id": landscape_rollup.id,
        }
    else:
        pending_count = run.pillar_rollups.exclude(
            status=ClimateForesightPillarRollupStatus.COMPLETED
        ).count()
        return {
            "run_id": run_id,
            "status": "waiting",
            "pending_pillar_rollups": pending_count,
        }


def trigger_promote_if_ready(run_id: int) -> Dict[str, Any]:
    """
    Check if PROMOTe analysis is ready to run and trigger it.

    PROMOTe is ready when landscape rollup is completed.

    Args:
        run_id: ID of the ClimateForesightRun

    Returns:
        dict: Summary of PROMOTe status
    """
    run = ClimateForesightRun.objects.get(pk=run_id)

    try:
        promote = run.promote_analysis
        landscape_rollup = run.landscape_rollup
    except (
        ClimateForesightPromote.DoesNotExist,
        ClimateForesightLandscapeRollup.DoesNotExist,
    ):
        return {"run_id": run_id, "status": "not_ready"}

    if promote.status != ClimateForesightPromoteStatus.PENDING:
        return {
            "run_id": run_id,
            "status": "already_processing",
            "promote_status": promote.status,
        }

    if landscape_rollup.status == ClimateForesightLandscapeRollupStatus.COMPLETED:
        log.info(f"Triggering PROMOTe analysis {promote.id}")

        promote_chain = chain(
            run_climate_foresight_promote.si(promote.id),
            process_promote_datalayers.s(),
            auto_progress_climate_foresight_run.si(run_id),
        )
        promote_chain.apply_async()

        return {
            "run_id": run_id,
            "status": "triggered",
            "promote_id": promote.id,
        }
    else:
        return {
            "run_id": run_id,
            "status": "waiting",
            "landscape_status": landscape_rollup.status,
        }


def check_run_completion(run_id: int) -> Dict[str, Any]:
    """
    Check if the entire analysis pipeline is complete and update run status.

    Args:
        run_id: ID of the ClimateForesightRun

    Returns:
        dict: Summary of run completion status
    """
    run = ClimateForesightRun.objects.get(pk=run_id)

    if run.status != ClimateForesightRunStatus.RUNNING:
        return {"run_id": run_id, "status": run.status}

    try:
        promote = run.promote_analysis
    except ClimateForesightPromote.DoesNotExist:
        return {"run_id": run_id, "status": "running", "promote_not_created": True}

    if promote.status == ClimateForesightPromoteStatus.COMPLETED:
        with transaction.atomic():
            run.status = ClimateForesightRunStatus.DONE
            run.save()

            if promote.geopackage_status in (GeoPackageStatus.PENDING, None):
                if promote.geopackage_status is None:
                    promote.geopackage_status = GeoPackageStatus.PENDING
                    promote.save(update_fields=["geopackage_status"])

                async_generate_climate_foresight_geopackage.delay(run_id)
                log.info(f"Triggered geopackage generation for run {run_id}")

        log.info(f"Run {run_id} marked as DONE")
        return {"run_id": run_id, "status": "done"}

    if promote.status == ClimateForesightPromoteStatus.FAILED:
        return {"run_id": run_id, "status": "running", "promote_failed": True}

    return {"run_id": run_id, "status": "running", "promote_status": promote.status}
