#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "requests>=2.31",
#     "python-decouple>=3.8",
# ]
# ///
"""OpenPanel -> Mixpanel event & profile migration CLI.

See README.md in this directory for the manual setup prerequisites, required
.env variables, and the recommended test-then-production rollout sequence.

Examples:
    uv run migrate.py export --start 2024-01-01 --end 2026-07-29
    uv run migrate.py convert
    uv run migrate.py upload --target test
    uv run migrate.py run --start 2024-01-01 --end 2026-07-29 --target test
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import date, datetime
from pathlib import Path

from decouple import Config, RepositoryEnv

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_DATA_DIR = SCRIPT_DIR / "data"
REPO_ROOT = SCRIPT_DIR.parents[1]

sys.path.insert(0, str(SCRIPT_DIR))

from convert import convert_all  # noqa: E402
from mixpanel_client import MixpanelClient, MixpanelConfig  # noqa: E402
from openpanel_client import OpenPanelClient, OpenPanelConfig, export_range  # noqa: E402

PRODUCTION_CONFIRM_PHRASE = "import to production"


def _load_env() -> Config:
    env_path = REPO_ROOT / ".env"
    if not env_path.exists():
        sys.exit(f"No .env found at {env_path} - copy .sample.env and fill in credentials.")
    return Config(RepositoryEnv(str(env_path)))


def _openpanel_config(config: Config) -> OpenPanelConfig:
    return OpenPanelConfig(
        base_url=config("OPENPANEL_URL"),
        client_id=config("OPENPANEL_EXPORT_CLIENT_ID"),
        client_secret=config("OPENPANEL_EXPORT_CLIENT_SECRET"),
        project_id=config("OPENPANEL_EXPORT_PROJECT_ID", default=None),
    )


def _mixpanel_config(config: Config, target: str) -> MixpanelConfig:
    prefix = "MIXPANEL_TEST" if target == "test" else "MIXPANEL_PROD"
    return MixpanelConfig(
        project_id=config(f"{prefix}_PROJECT_ID"),
        service_account_username=config(f"{prefix}_SA_USERNAME"),
        service_account_secret=config(f"{prefix}_SA_SECRET"),
    )


def _parse_date(value: str) -> date:
    return datetime.strptime(value, "%Y-%m-%d").date()


def _confirm_production() -> None:
    typed = input(
        f'Type "{PRODUCTION_CONFIRM_PHRASE}" to confirm writing to Mixpanel PRODUCTION: '
    )
    if typed.strip() != PRODUCTION_CONFIRM_PHRASE:
        sys.exit("Confirmation phrase did not match - aborting.")


def _read_ndjson(path: Path):
    with path.open() as f:
        for line in f:
            line = line.strip()
            if line:
                yield json.loads(line)


def cmd_export(args: argparse.Namespace) -> None:
    config = _load_env()
    client = OpenPanelClient(_openpanel_config(config))
    export_range(
        client,
        start=args.start,
        end=args.end,
        chunk_days=args.chunk_days,
        raw_dir=args.data_dir / "raw",
        force=args.force,
    )


def cmd_convert(args: argparse.Namespace) -> None:
    result = convert_all(
        raw_dir=args.data_dir / "raw",
        converted_dir=args.data_dir / "converted",
        skipped_path=args.data_dir / "skipped.ndjson",
    )
    print(
        f"converted {result['events']} events, {result['profiles']} profiles, "
        f"skipped {result['skipped']} records"
    )


def cmd_upload(args: argparse.Namespace) -> None:
    if args.target == "production" and not args.yes_really_production:
        _confirm_production()

    config = _load_env()
    client = MixpanelClient(_mixpanel_config(config, args.target))
    failed_dir = args.data_dir / "failed"

    events_path = args.data_dir / "converted" / "events.ndjson"
    profiles_path = args.data_dir / "converted" / "profiles.ndjson"

    if args.kind in ("events", "all"):
        if events_path.exists():
            result = client.import_events(_read_ndjson(events_path), failed_dir)
            print(f"events: imported={result['imported']} failed={result['failed']}")
        else:
            print(f"no {events_path} - run `convert` first")

    if args.kind in ("profiles", "all"):
        if profiles_path.exists():
            result = client.import_profiles(_read_ndjson(profiles_path), failed_dir)
            print(f"profiles: imported={result['imported']} failed={result['failed']}")
        else:
            print(f"no {profiles_path} - run `convert` first")


def cmd_run(args: argparse.Namespace) -> None:
    cmd_export(args)
    cmd_convert(args)
    cmd_upload(args)


def _add_common_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=DEFAULT_DATA_DIR,
        help="Directory for raw/converted/failed data (default: scripts/openpanel_to_mixpanel/data)",
    )


def _add_date_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--start", type=_parse_date, required=True, help="YYYY-MM-DD")
    parser.add_argument("--end", type=_parse_date, required=True, help="YYYY-MM-DD")
    parser.add_argument(
        "--chunk-days", type=int, default=30, help="Days per export window (default: 30)"
    )
    parser.add_argument(
        "--force", action="store_true", help="Re-fetch windows that already have output on disk"
    )


def _add_target_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--target", choices=["test", "production"], required=True, help="Which Mixpanel project"
    )
    parser.add_argument(
        "--yes-really-production",
        action="store_true",
        help="Skip the interactive confirmation prompt for --target production",
    )
    parser.add_argument(
        "--kind", choices=["events", "profiles", "all"], default="all"
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    export_p = subparsers.add_parser("export", help="Pull raw events from OpenPanel to disk")
    _add_common_args(export_p)
    _add_date_args(export_p)
    export_p.set_defaults(func=cmd_export)

    convert_p = subparsers.add_parser(
        "convert", help="Convert raw OpenPanel events/profiles into Mixpanel-ready NDJSON"
    )
    _add_common_args(convert_p)
    convert_p.set_defaults(func=cmd_convert)

    upload_p = subparsers.add_parser("upload", help="Upload converted data to Mixpanel")
    _add_common_args(upload_p)
    _add_target_args(upload_p)
    upload_p.set_defaults(func=cmd_upload)

    run_p = subparsers.add_parser("run", help="export + convert + upload in one go")
    _add_common_args(run_p)
    _add_date_args(run_p)
    _add_target_args(run_p)
    run_p.set_defaults(func=cmd_run)

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
