from typing import Optional

import requests
from decouple import Config, RepositoryEnv

config = Config(RepositoryEnv("../../.env"))

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
