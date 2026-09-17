#!/usr/bin/env python
"""Build a realistic set of Project Areas in Planscape using only its API.

For every input area file this script:

1. creates a Planning Area from the file's polygons (the same GeoJSON payload
   the UI sends after parsing an upload);
2. waits until Planscape finishes preparing the Planning Area;
3. for every size in MAX_PROJECT_AREA_SIZES creates a preset ForSys scenario
   with a random treatment goal available for that area, 500ac stands, all
   included areas, no excluded areas and no threshold constraints, and runs it;
4. waits for the scenarios to finish and reports the project areas created.

Credentials come from --email/--password, the [planscape] section of the
.planconfig file at the repository root, or an interactive prompt.

Usage (from the repository root, with the project virtualenv):

    python src/planscape/bin/build_project_areas.py areas/ --env dev
    python src/planscape/bin/build_project_areas.py area1.zip area2.geojson \\
        --base-url http://localhost:8000/planscape-backend/ \\
        --sizes 500,1000,5000 --max-project-count 10
"""

import argparse
import getpass
import logging
import random
import sys
import time
import zipfile
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Optional

import fiona
import requests
import toml
from fiona.errors import FionaError
from fiona.model import to_dict
from fiona.transform import transform_geom

# ---------------------------------------------------------------------------
# What gets built - change these (or use the matching CLI flags).
# ---------------------------------------------------------------------------

# Maximum number of project areas ForSys can create in each scenario.
MAX_PROJECT_COUNT = 10

# One scenario is created per size. Each value is the maximum size, in acres,
# of a single project area and must be at least MIN_PROJECT_AREA_SIZE.
MAX_PROJECT_AREA_SIZES = [500, 1_000, 2_500, 5_000, 10_000]

# LARGE stands are 500 acres.
STAND_SIZE = "LARGE"

# Smallest project area the backend accepts for LARGE stands, in acres.
MIN_PROJECT_AREA_SIZE = 494

# Estimated treatment cost per acre, in USD.
ESTIMATED_COST = 2470

POLL_INTERVAL_SECONDS = 15
PLANNING_AREA_TIMEOUT_SECONDS = 2 * 60 * 60
SCENARIO_TIMEOUT_SECONDS = 2 * 60 * 60
REQUEST_TIMEOUT_SECONDS = 120
GET_ATTEMPTS = 3

# ---------------------------------------------------------------------------

ENV_BASE_URLS = {
    "local": "http://localhost:8000/planscape-backend/",
    "dev": "https://dev.planscape.org/planscape-backend/",
    "staging": "https://staging.planscape.org/planscape-backend/",
    "app": "https://app.planscape.org/planscape-backend/",
}
PLANCONFIG_PATH = Path(__file__).resolve().parents[3] / ".planconfig"
SUPPORTED_SUFFIXES = {".zip", ".shp", ".geojson", ".json", ".gpkg"}
RETRY_STATUS_CODES = {502, 503, 504}

PLANNING_AREA_FINISHED = {"DONE", "FAILED", "OVERSIZE"}
SCENARIO_FINISHED = {"SUCCESS", "FAILURE", "PANIC", "TIMED_OUT"}

log = logging.getLogger("build_project_areas")


class ApiError(Exception):
    def __init__(self, response: requests.Response):
        self.response = response
        super().__init__(
            f"{response.request.method} {response.url} returned "
            f"{response.status_code}: {response.text[:2000]}"
        )


class PlanscapeClient:
    def __init__(self, base_url: str, email: str, password: str):
        self.base_url = base_url.rstrip("/") + "/"
        self.email = email
        self.password = password
        self.session = requests.Session()
        self.login()

    def login(self) -> None:
        response = requests.post(
            self.base_url + "dj-rest-auth/login/",
            json={"email": self.email, "password": self.password},
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        if not response.ok:
            raise ApiError(response)
        self.session.headers["Authorization"] = f"Bearer {response.json()['access']}"

    def get(self, path: str, **kwargs) -> Any:
        return self.request("GET", path, **kwargs)

    def post(self, path: str, payload: Optional[dict[str, Any]] = None) -> Any:
        return self.request("POST", path, json=payload or {})

    def patch(self, path: str, payload: dict[str, Any]) -> Any:
        return self.request("PATCH", path, json=payload)

    def request(self, method: str, path: str, **kwargs) -> Any:
        url = self.base_url + path
        # only idempotent requests are retried on transient failures
        retries = GET_ATTEMPTS - 1 if method == "GET" else 0
        for _ in range(retries):
            try:
                response = self._send(method, url, **kwargs)
                if response.status_code not in RETRY_STATUS_CODES:
                    return self._parse(response)
            except (requests.ConnectionError, requests.Timeout):
                pass
            time.sleep(POLL_INTERVAL_SECONDS)
        return self._parse(self._send(method, url, **kwargs))

    @staticmethod
    def _parse(response: requests.Response) -> Any:
        if not response.ok:
            raise ApiError(response)
        return response.json() if response.content else None

    def _send(self, method: str, url: str, **kwargs) -> requests.Response:
        response = self.session.request(
            method, url, timeout=REQUEST_TIMEOUT_SECONDS, **kwargs
        )
        if response.status_code == 401:
            # access tokens expire after a few hours, long runs need a new one
            self.login()
            response = self.session.request(
                method, url, timeout=REQUEST_TIMEOUT_SECONDS, **kwargs
            )
        return response


@dataclass
class ScenarioRun:
    max_area: float
    name: str
    treatment_goal: str
    id: Optional[int] = None
    status: str = "NOT_CREATED"
    error: str = ""
    project_area_count: int = 0


@dataclass
class AreaRun:
    source: Path
    name: str
    id: Optional[int] = None
    status: str = "NOT_CREATED"
    error: str = ""
    scenarios: list[ScenarioRun] = field(default_factory=list)


def collect_input_files(paths: list[Path]) -> list[Path]:
    files: list[Path] = []
    for path in paths:
        if path.is_dir():
            files.extend(
                sorted(
                    p
                    for p in path.iterdir()
                    if p.is_file() and p.suffix.lower() in SUPPORTED_SUFFIXES
                )
            )
        elif path.is_file():
            files.append(path)
        else:
            raise FileNotFoundError(f"Input {path} does not exist.")
    return files


def get_dataset_uris(path: Path) -> list[str]:
    if path.suffix.lower() != ".zip":
        return [str(path)]

    # exported shapefiles are often nested in a folder inside the archive
    with zipfile.ZipFile(path) as archive:
        shapefiles = [
            name
            for name in archive.namelist()
            if name.lower().endswith(".shp") and not name.startswith("__MACOSX/")
        ]
    if not shapefiles:
        raise ValueError(f"{path} does not contain a shapefile.")
    return [f"zip://{path.resolve()}!{name}" for name in shapefiles]


def read_area(path: Path) -> dict[str, Any]:
    """Reads the polygons of a spatial file as a WGS84 GeoJSON FeatureCollection."""
    features = []
    for uri in get_dataset_uris(path):
        with fiona.open(uri) as source:
            source_crs = source.crs if source.crs else "EPSG:4326"
            for feature in source:
                geometry = feature.geometry
                if geometry is None or geometry.type not in (
                    "Polygon",
                    "MultiPolygon",
                ):
                    continue
                features.append(
                    {
                        "type": "Feature",
                        "properties": {},
                        "geometry": to_dict(
                            transform_geom(source_crs, "EPSG:4326", geometry)
                        ),
                    }
                )

    if not features:
        raise ValueError(f"{path} has no polygon features.")
    return {"type": "FeatureCollection", "features": features}


def create_planning_area(
    client: PlanscapeClient,
    path: Path,
    label: str,
    workspace: Optional[int],
) -> AreaRun:
    # planning area names are limited to 120 characters
    area = AreaRun(source=path, name=f"{path.stem} {label}"[:120])
    try:
        payload: dict[str, Any] = {"name": area.name, "geometry": read_area(path)}
        if workspace:
            payload["workspace"] = workspace
        created = client.post("v2/planningareas/", payload)
    except (
        ApiError,
        requests.RequestException,
        FionaError,
        zipfile.BadZipFile,
        OSError,
        ValueError,
    ) as e:
        area.status, area.error = "ERROR", str(e)
        log.error("Could not create a planning area from %s: %s", path, e)
        return area

    area.id = created["id"]
    area.status = created.get("map_status") or "PENDING"
    log.info(
        "Created planning area %s '%s' (%s acres) from %s",
        area.id,
        area.name,
        created.get("area_acres"),
        path,
    )
    return area


def wait_for(
    items: list[Any],
    fetch_status: Callable[[Any], Optional[str]],
    finished: set[str],
    timeout_seconds: int,
    label: str,
) -> None:
    pending = [item for item in items if item.status not in finished]
    deadline = time.monotonic() + timeout_seconds
    while pending:
        for item in list(pending):
            try:
                status = fetch_status(item) or "UNKNOWN"
            except (ApiError, requests.RequestException) as e:
                item.status, item.error = "ERROR", str(e)
                log.error("Could not check %s %s: %s", label, item.id, e)
                pending.remove(item)
                continue

            if status != item.status:
                log.info("%s %s: %s -> %s", label, item.id, item.status, status)
                item.status = status
            if status in finished:
                pending.remove(item)

        if not pending:
            return
        if time.monotonic() > deadline:
            for item in pending:
                item.error = (
                    f"Gave up after {timeout_seconds}s on status {item.status}."
                )
                item.status = "TIMEOUT"
            return
        time.sleep(POLL_INTERVAL_SECONDS)


def get_included_area_ids(client: PlanscapeClient) -> list[int]:
    """All inclusion layers ForSys offers, like selecting every area in the UI.

    Omitting `included_areas` is not the same as including everything: with the
    ADD_INCLUDES flag on, a scenario without included areas has no stands.
    """
    forsys = client.get("v2/modules/forsys/")
    return [layer["id"] for layer in forsys["options"]["inclusions"]]


def create_and_run_scenario(
    client: PlanscapeClient,
    area: AreaRun,
    treatment_goal: dict[str, Any],
    max_area: float,
    max_project_count: int,
    included_area_ids: list[int],
) -> ScenarioRun:
    scenario = ScenarioRun(
        max_area=max_area,
        name=f"Max {max_area:,.0f} ac - {treatment_goal['name']}"[:100],
        treatment_goal=treatment_goal["name"],
    )
    configuration: dict[str, Any] = {
        "stand_size": STAND_SIZE,
        "excluded_areas": [],
        "constraints": [],
        "targets": {
            "max_area": max_area,
            "max_project_count": max_project_count,
            "estimated_cost": ESTIMATED_COST,
        },
    }
    if included_area_ids:
        configuration["included_areas"] = included_area_ids

    try:
        draft = client.post(
            "v2/scenarios/draft/",
            {"name": scenario.name, "planning_area": area.id, "type": "PRESET"},
        )
        scenario.id = draft["id"]
        client.patch(
            f"v2/scenarios/{scenario.id}/draft/",
            {
                "treatment_goal": treatment_goal["id"],
                "planning_approach": "OPTIMIZE_PROJECT_AREAS",
                "configuration": configuration,
            },
        )
        run = client.post(f"v2/scenarios/{scenario.id}/run/")
    except (ApiError, requests.RequestException) as e:
        scenario.status, scenario.error = "ERROR", str(e)
        log.error(
            "Could not run scenario '%s' on area %s: %s", scenario.name, area.id, e
        )
        return scenario

    scenario.status = (run.get("scenario_result") or {}).get("status") or "PENDING"
    log.info(
        "Running scenario %s '%s' on planning area %s",
        scenario.id,
        scenario.name,
        area.id,
    )
    return scenario


def run_scenarios(
    client: PlanscapeClient,
    area: AreaRun,
    sizes: list[float],
    max_project_count: int,
    included_area_ids: list[int],
    rng: random.Random,
) -> None:
    try:
        treatment_goals = client.get(
            "v2/treatment-goals/", params={"planning_area": area.id}
        )
    except (ApiError, requests.RequestException) as e:
        area.error = f"Could not list treatment goals: {e}"
        log.error("Planning area %s: %s", area.id, area.error)
        return

    if not treatment_goals:
        area.error = "No treatment goals are available for this planning area."
        log.error("Planning area %s: %s", area.id, area.error)
        return

    for max_area in sizes:
        area.scenarios.append(
            create_and_run_scenario(
                client=client,
                area=area,
                treatment_goal=rng.choice(treatment_goals),
                max_area=max_area,
                max_project_count=max_project_count,
                included_area_ids=included_area_ids,
            )
        )


def count_project_areas(client: PlanscapeClient, scenarios: list[ScenarioRun]) -> None:
    for scenario in scenarios:
        if scenario.status != "SUCCESS":
            continue
        try:
            project_areas = client.get(f"v2/scenarios/{scenario.id}/project-areas/")
        except (ApiError, requests.RequestException) as e:
            scenario.error = f"Could not list project areas: {e}"
            continue
        scenario.project_area_count = len(project_areas)
        if not project_areas:
            scenario.error = "Scenario finished without project areas."


def build(
    client: PlanscapeClient,
    files: list[Path],
    sizes: list[float],
    max_project_count: int,
    workspace: Optional[int],
    label: str,
    rng: random.Random,
) -> list[AreaRun]:
    areas = [create_planning_area(client, path, label, workspace) for path in files]
    created_areas = [area for area in areas if area.id is not None]
    log.info("Waiting for %s planning area(s) to be ready...", len(created_areas))
    wait_for(
        created_areas,
        lambda area: client.get(f"v2/planningareas/{area.id}/")["map_status"],
        PLANNING_AREA_FINISHED,
        PLANNING_AREA_TIMEOUT_SECONDS,
        "Planning area",
    )

    ready_areas = [area for area in created_areas if area.status == "DONE"]
    if not ready_areas:
        return areas

    included_area_ids = get_included_area_ids(client)
    log.info(
        "Including %s area layer(s): %s", len(included_area_ids), included_area_ids
    )
    for area in ready_areas:
        run_scenarios(client, area, sizes, max_project_count, included_area_ids, rng)

    # scenarios that failed to start stay in DRAFT, there is nothing to wait for
    scenarios = [
        scenario
        for area in ready_areas
        for scenario in area.scenarios
        if not scenario.error
    ]
    log.info("Waiting for %s scenario(s) to finish...", len(scenarios))
    wait_for(
        scenarios,
        lambda scenario: (
            client.get(f"v2/scenarios/{scenario.id}/").get("scenario_result") or {}
        ).get("status"),
        SCENARIO_FINISHED,
        SCENARIO_TIMEOUT_SECONDS,
        "Scenario",
    )
    count_project_areas(client, scenarios)
    return areas


def is_successful(area: AreaRun) -> bool:
    return (
        area.status == "DONE"
        and not area.error
        and all(
            scenario.status == "SUCCESS" and not scenario.error
            for scenario in area.scenarios
        )
    )


def print_summary(areas: list[AreaRun]) -> None:
    print("\nSummary")
    for area in areas:
        print(f"- {area.name} (planning area {area.id}): {area.status} {area.error}")
        for scenario in area.scenarios:
            print(
                f"    scenario {scenario.id} max {scenario.max_area:,.0f} ac, "
                f"goal '{scenario.treatment_goal}': {scenario.status}, "
                f"{scenario.project_area_count} project area(s) {scenario.error}"
            )


def parse_sizes(value: str) -> list[float]:
    try:
        sizes = [float(size) for size in value.split(",") if size.strip()]
    except ValueError:
        raise argparse.ArgumentTypeError(f"Invalid sizes '{value}'.")
    if not sizes:
        raise argparse.ArgumentTypeError("At least one size is required.")
    too_small = [size for size in sizes if size < MIN_PROJECT_AREA_SIZE]
    if too_small:
        raise argparse.ArgumentTypeError(
            f"Sizes must be at least {MIN_PROJECT_AREA_SIZE} acres: {too_small}."
        )
    return sizes


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        "inputs",
        nargs="+",
        type=Path,
        help="Area files (.zip, .shp, .geojson, .json, .gpkg) or directories.",
    )
    parser.add_argument("--email", help="Defaults to .planconfig's email.")
    parser.add_argument("--password", help="Defaults to .planconfig's password.")
    parser.add_argument(
        "--env",
        choices=sorted(ENV_BASE_URLS),
        help="Target environment. Defaults to .planconfig's env, then local.",
    )
    parser.add_argument("--base-url", help="Backend URL, overrides --env.")
    parser.add_argument(
        "--sizes",
        type=parse_sizes,
        default=MAX_PROJECT_AREA_SIZES,
        help="Comma separated max project area sizes in acres, one scenario each. "
        f"Defaults to {','.join(str(s) for s in MAX_PROJECT_AREA_SIZES)}.",
    )
    parser.add_argument(
        "--max-project-count",
        type=int,
        default=MAX_PROJECT_COUNT,
        help=f"Max project areas per scenario. Defaults to {MAX_PROJECT_COUNT}.",
    )
    parser.add_argument(
        "--workspace", type=int, help="Workspace to create planning areas in."
    )
    parser.add_argument(
        "--label",
        default=datetime.now().strftime("%Y%m%d-%H%M%S"),
        help="Suffix for planning area names, keeps reruns unique. Defaults to now.",
    )
    parser.add_argument(
        "--seed", type=int, help="Random seed for treatment goal selection."
    )
    args = parser.parse_args()
    if args.max_project_count < 1:
        parser.error("--max-project-count must be at least 1.")
    return args


def main() -> int:
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s"
    )
    args = parse_args()
    planconfig = (
        toml.load(PLANCONFIG_PATH).get("planscape", {})
        if PLANCONFIG_PATH.exists()
        else {}
    )

    env = args.env or planconfig.get("env") or "local"
    base_url = args.base_url or ENV_BASE_URLS.get(env)
    if not base_url:
        log.error("Unknown env '%s'. Use one of %s.", env, sorted(ENV_BASE_URLS))
        return 2
    email = args.email or planconfig.get("email") or input("Email: ")
    password = (
        args.password or planconfig.get("password") or getpass.getpass("Password: ")
    )

    files = collect_input_files(args.inputs)
    if not files:
        log.error("No area files found in %s.", [str(p) for p in args.inputs])
        return 2

    log.info(
        "Building %s planning area(s) on %s with sizes %s and up to %s project areas",
        len(files),
        base_url,
        args.sizes,
        args.max_project_count,
    )
    client = PlanscapeClient(base_url, email, password)
    areas = build(
        client=client,
        files=files,
        sizes=args.sizes,
        max_project_count=args.max_project_count,
        workspace=args.workspace,
        label=args.label,
        rng=random.Random(args.seed),
    )
    print_summary(areas)
    return 0 if all(is_successful(area) for area in areas) else 1


if __name__ == "__main__":
    sys.exit(main())
