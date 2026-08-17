import math
import os
import time
from dataclasses import dataclass

import google.auth
import redis
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from google.auth.transport.requests import AuthorizedSession


@dataclass(frozen=True)
class WorkerScaleConfig:
    name: str
    service: str
    queues: list[str]
    messages_per_instance: int
    min_instances: int
    max_instances: int


def get_required_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise CommandError(f"{name} is required")
    return value


def get_int_env(name: str, default: int) -> int:
    value = os.environ.get(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError as exc:
        raise CommandError(f"{name} must be an integer") from exc


def get_queues(name: str) -> list[str]:
    return [queue.strip() for queue in get_required_env(name).split(",") if queue.strip()]


def clamp(value: int, minimum: int, maximum: int) -> int:
    return max(minimum, min(value, maximum))


class Command(BaseCommand):
    help = "Scale Cloud Run Celery workers based on Redis queue length."

    def handle(self, *args, **options):
        project = get_required_env("GCP_PROJECT")
        region = get_required_env("GCP_REGION")
        cooldown_seconds = get_int_env("CELERY_AUTOSCALER_SCALE_DOWN_COOLDOWN", 900)
        state_prefix = os.environ.get(
            "CELERY_AUTOSCALER_STATE_PREFIX", "celery-autoscaler"
        )

        workers = [
            WorkerScaleConfig(
                name="general",
                service=get_required_env("CELERY_GENERAL_WORKER_SERVICE"),
                queues=get_queues("CELERY_GENERAL_QUEUES"),
                messages_per_instance=get_int_env(
                    "CELERY_GENERAL_MESSAGES_PER_INSTANCE", 10
                ),
                min_instances=get_int_env("CELERY_GENERAL_MIN_INSTANCES", 1),
                max_instances=get_int_env("CELERY_GENERAL_MAX_INSTANCES", 10),
            ),
            WorkerScaleConfig(
                name="heavy",
                service=get_required_env("CELERY_HEAVY_WORKER_SERVICE"),
                queues=get_queues("CELERY_HEAVY_QUEUES"),
                messages_per_instance=get_int_env(
                    "CELERY_HEAVY_MESSAGES_PER_INSTANCE", 2
                ),
                min_instances=get_int_env("CELERY_HEAVY_MIN_INSTANCES", 1),
                max_instances=get_int_env("CELERY_HEAVY_MAX_INSTANCES", 10),
            ),
        ]

        redis_client = redis.Redis.from_url(settings.CELERY_BROKER_URL)
        credentials, _ = google.auth.default(
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
        session = AuthorizedSession(credentials)
        now = int(time.time())

        for worker in workers:
            self.scale_worker(
                redis_client=redis_client,
                session=session,
                project=project,
                region=region,
                worker=worker,
                cooldown_seconds=cooldown_seconds,
                state_prefix=state_prefix,
                now=now,
            )

    def scale_worker(
        self,
        redis_client: redis.Redis,
        session: AuthorizedSession,
        project: str,
        region: str,
        worker: WorkerScaleConfig,
        cooldown_seconds: int,
        state_prefix: str,
        now: int,
    ) -> None:
        if worker.messages_per_instance <= 0:
            raise CommandError(
                f"{worker.name} messages_per_instance must be greater than zero"
            )

        queue_lengths = {queue: redis_client.llen(queue) for queue in worker.queues}
        backlog = sum(queue_lengths.values())
        desired = math.ceil(backlog / worker.messages_per_instance) if backlog else 0
        desired = clamp(desired, worker.min_instances, worker.max_instances)

        current = self.get_current_min_instances(
            session, project, region, worker.service
        )
        state_key = f"{state_prefix}:{worker.name}:last_backlog_at"

        if backlog > 0:
            redis_client.set(state_key, now)
        elif desired < current:
            last_backlog_at_raw = redis_client.get(state_key)
            last_backlog_at = int(last_backlog_at_raw or 0)
            elapsed = now - last_backlog_at
            if elapsed < cooldown_seconds:
                self.stdout.write(
                    f"{worker.name}: backlog=0 current={current} desired={desired} "
                    f"action=skip_scale_down cooldown_remaining="
                    f"{cooldown_seconds - elapsed}s queues={queue_lengths}"
                )
                return

        if desired == current:
            action = "none"
        else:
            self.update_min_instances(
                session, project, region, worker.service, desired
            )
            action = "scale_up" if desired > current else "scale_down"

        self.stdout.write(
            f"{worker.name}: backlog={backlog} current={current} desired={desired} "
            f"action={action} queues={queue_lengths}"
        )

    def get_current_min_instances(
        self, session: AuthorizedSession, project: str, region: str, service: str
    ) -> int:
        url = self.get_service_url(project, region, service)
        response = session.get(url, timeout=30)
        response.raise_for_status()
        service_config = response.json()
        scaling = service_config.get("template", {}).get("scaling", {})
        return int(scaling.get("minInstanceCount", 0))

    def update_min_instances(
        self,
        session: AuthorizedSession,
        project: str,
        region: str,
        service: str,
        min_instances: int,
    ) -> None:
        url = (
            f"{self.get_service_url(project, region, service)}"
            "?updateMask=template.scaling.min_instance_count"
        )
        response = session.patch(
            url,
            json={"template": {"scaling": {"minInstanceCount": min_instances}}},
            timeout=30,
        )
        response.raise_for_status()

    def get_service_url(self, project: str, region: str, service: str) -> str:
        return (
            f"https://run.googleapis.com/v2/projects/{project}/locations/"
            f"{region}/services/{service}"
        )
