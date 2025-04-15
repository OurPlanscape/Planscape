#!/usr/bin/env python3
import re
import subprocess
from collections import defaultdict
from typing import Dict, Optional, Tuple

import requests
from decouple import Config, RepositoryEnv

config = Config(RepositoryEnv("../../.env"))
ENV = config("ENV")
# === Configuration ===
MATTERMOST_WEBHOOK_URL: Optional[str] = config(
    "MATTERMOST_WEBHOOK_URL",
    default=None,
    cast=str,
)  # type: ignore
MATTERMOST_CHANNEL: str = config(
    "MATTERMOST_CHANNEL",
    "#planscape-alerts-dev",
    cast=str,
)  # type: ignore

CELERY_CMD = [
    "/home/planscape/.local/bin/celery",
    "-A",
    "planscape",
    "inspect",
    "active",
]

EXPECTED_COUNTS = {
    "celery": config("EXPECTED_CELERY_WORKERS", 2, cast=int),
    "forsys": config("EXPECTED_FORSYS_WORKERS", 12, cast=int),
    "impacts": config("EXPECTED_IMPACTS_WORKERS", 18, cast=int),
    "other": config("EXPECTED_OTHER_WORKERS", 0, cast=int),
}


def run_celery_command() -> str:
    try:
        result = subprocess.run(CELERY_CMD, capture_output=True, text=True, check=True)
        return result.stdout
    except subprocess.CalledProcessError as e:
        return f"Error running celery command:\n{e.stderr or str(e)}"


def parse_worker_output(output: str) -> Tuple[Dict[str, int], int]:
    worker_counts = defaultdict(int)
    pattern = r"->\s+([a-zA-Z0-9_-]+)@"

    matches = re.findall(pattern, output)
    for match in matches:
        prefix = match.split("-")[0] if "-" in match else "other"
        worker_counts[prefix] += 1

    for key in EXPECTED_COUNTS:
        worker_counts.setdefault(key, 0)

    return worker_counts, len(matches)


def format_mattermost_message(worker_counts: Dict[str, int], total: int) -> str:
    lines = [f"### Celery Workers {ENV}"]
    lines.append(f"**Total Workers Detected:** {total}\n")

    for prefix in sorted(EXPECTED_COUNTS.keys()):
        expected = EXPECTED_COUNTS[prefix]
        actual = worker_counts[prefix]
        if actual == expected:
            status = ":white_check_mark:"
        else:
            status = ":warning:"
        lines.append(
            f"{status} **{prefix}** — expected: `{expected}`, found: `{actual}`"
        )

    return "\n".join(lines)


def post_to_mattermost(message: str) -> None:
    if not MATTERMOST_WEBHOOK_URL:
        return
    payload = {
        "channel": MATTERMOST_CHANNEL,
        "text": message,
    }
    response = requests.post(MATTERMOST_WEBHOOK_URL, json=payload)
    if response.status_code != 200:
        raise Exception(f"Failed to send message to Mattermost: {response.text}")


def main():
    output = run_celery_command()
    if output.startswith("Error"):
        post_to_mattermost(f":x: {output}")
        return

    worker_counts, total = parse_worker_output(output)
    message = format_mattermost_message(worker_counts, total)
    post_to_mattermost(message)


if __name__ == "__main__":
    main()
