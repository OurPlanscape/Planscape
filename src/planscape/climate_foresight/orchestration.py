"""
Orchestration service for Climate Foresight analysis pipeline.

This module coordinates the full analysis workflow:
1. Normalize all input data layers
2. Rollup pillars (aggregate normalized layers by pillar)
3. Rollup landscape (aggregate pillar rollups + future climate)
4. Run PROMOTe analysis (generate MPAT outputs)
"""

import logging
from typing import Any, Dict, List

from celery import chain, chord, group
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
    async_mark_run_failed,
    mark_run_complete,
    normalize_climate_foresight_input_layer,
    process_landscape_datalayers,
    process_normalized_datalayers,
    process_pillar_datalayers,
    process_promote_datalayers,
    rollup_climate_foresight_landscape,
    rollup_climate_foresight_pillar,
    run_climate_foresight_promote,
)

log = logging.getLogger(__name__)


def start_climate_foresight_analysis(run_id: int) -> Dict[str, Any]:
    """
    Start the full Climate Foresight analysis pipeline.

    This orchestrates a Celery workflow:
    1. Normalize all input layers in parallel (chord)
    2. Rollup all pillars in parallel (chord)
    3. Rollup landscape (single task)
    4. Run PROMOTe analysis (single task)
    5. Mark run complete

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

        input_layers = list(run.input_datalayers.select_related("datalayer").all())
        normalization_layer_ids = [
            il.id
            for il in input_layers
            if il.status
            not in [InputDataLayerStatus.COMPLETED, InputDataLayerStatus.RUNNING]
        ]

        assigned_pillars = (
            run.input_datalayers.values_list("pillar_id", flat=True)
            .distinct()
            .exclude(pillar_id__isnull=True)
        )

        pillar_rollup_ids = []
        for pillar_id in assigned_pillars:
            pillar_rollup, created = ClimateForesightPillarRollup.objects.get_or_create(
                run=run,
                pillar_id=pillar_id,
                defaults={"status": ClimateForesightPillarRollupStatus.PENDING},
            )
            pillar_rollup_ids.append(pillar_rollup.id)
            if created:
                log.info(
                    f"Created pillar rollup {pillar_rollup.id} for pillar {pillar_id}"
                )

        landscape_rollup, created = (
            ClimateForesightLandscapeRollup.objects.get_or_create(
                run=run,
                defaults={"status": ClimateForesightLandscapeRollupStatus.PENDING},
            )
        )
        if created:
            log.info(f"Created landscape rollup {landscape_rollup.id}")

        promote, created = ClimateForesightPromote.objects.get_or_create(
            run=run,
            defaults={"status": ClimateForesightPromoteStatus.PENDING},
        )
        if created:
            log.info(f"Created PROMOTe record {promote.id}")

    workflow = build_analysis_workflow(
        run_id=run_id,
        normalization_layer_ids=normalization_layer_ids,
        pillar_rollup_ids=pillar_rollup_ids,
        landscape_rollup_id=landscape_rollup.id,
        promote_id=promote.id,
    )

    error_handler = async_mark_run_failed.si(run_id)
    workflow.on_error(error_handler).apply_async()

    log.info(f"Triggered analysis workflow for run {run_id}")

    return {
        "run_id": run_id,
        "status": "started",
        "normalization_tasks": len(normalization_layer_ids),
        "pillar_rollups": pillar_rollup_ids,
        "landscape_rollup_id": landscape_rollup.id,
        "promote_id": promote.id,
    }


def build_analysis_workflow(
    run_id: int,
    normalization_layer_ids: List[int],
    pillar_rollup_ids: List[int],
    landscape_rollup_id: int,
    promote_id: int,
):
    """
    Build the Celery workflow for the full analysis pipeline.

    Structure:
    - chord(normalize all inputs) -> process normalized datalayers
    - chord(rollup all pillars) -> process pillar datalayers
    - rollup landscape -> process landscape datalayers
    - run PROMOTe -> process promote datalayers
    - mark complete
    """
    stages = []

    if normalization_layer_ids:
        normalize_tasks = group(
            normalize_climate_foresight_input_layer.si(layer_id)
            for layer_id in normalization_layer_ids
        )
        normalize_callback = process_normalized_datalayers.si(run_id)
        stages.append(chord(normalize_tasks, normalize_callback))

    if pillar_rollup_ids:
        pillar_tasks = group(
            rollup_climate_foresight_pillar.si(pr_id) for pr_id in pillar_rollup_ids
        )
        pillar_callback = process_pillar_datalayers.si(run_id)
        stages.append(chord(pillar_tasks, pillar_callback))

    stages.extend(
        [
            rollup_climate_foresight_landscape.si(landscape_rollup_id),
            process_landscape_datalayers.s(),
            run_climate_foresight_promote.si(promote_id),
            process_promote_datalayers.s(),
            mark_run_complete.si(run_id),
        ]
    )

    return chain(*stages)


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
