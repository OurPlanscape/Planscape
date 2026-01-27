import csv
import json
import multiprocessing
import re
import subprocess
from functools import partial
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

import requests
from core.base_commands import PlanscapeCommand
from core.gcs import is_gcs_file
from core.gcs import upload_file_via_api as upload_to_gcs
from core.pprint import pprint
from core.s3 import is_s3_file, list_files
from core.s3 import upload_file_via_api as upload_to_s3
from django.core.management.base import CommandParser
from gis.core import (
    fetch_datalayer_type,
    fetch_geometry_type,
    get_layer_info,
    with_vsi_prefix,
)
from gis.io import detect_mimetype
from gis.rasters import to_planscape as to_planscape_raster
from gis.vectors import to_planscape_multi_layer
from modules.base import MODULE_HANDLERS
from requests import Response
from requests.exceptions import JSONDecodeError

from datasets.models import DataLayer, DataLayerType, MapServiceChoices
from datasets.parsers import get_and_parse_datalayer_file_metadata

TREATMENT_METADATA_REGEX = re.compile(
    r"^(?P<action>\w+_\d{1,2})_(?P<year>\d{4})_(?P<variable>\w+)"
)
BASELINE_METADATA_REGEX = re.compile(
    r"^(?P<baseline>Baseline)_(?P<year>\d{4})_(?P<variable>\w+)"
)


class PlanscapeCLIException(Exception):
    pass


class DataLayerAlreadyExists(PlanscapeCLIException):
    pass


def get_impacts_metadata(input_file: str) -> Optional[Dict[str, Any]]:
    name = name_from_input_file(input_file)
    match = TREATMENT_METADATA_REGEX.match(name)
    if match:
        action = match.group("action").upper()
        baseline = False
    else:
        match = BASELINE_METADATA_REGEX.match(name)
        action = None
        baseline = True

    year = match.group("year")  # type: ignore
    variable = match.group("variable")  # type: ignore

    return {
        "modules": {
            "impacts": {
                "baseline": baseline,
                "variable": variable,
                "year": int(year),
                "action": action,
            }
        }
    }


def get_create_call(
    name,
    input_file,
    dataset,
    metadata: Optional[str] = None,
    map_service_type: Optional[str] = None,
) -> List[str]:
    command = [
        "python3",
        "manage.py",
        "datalayers",
        "create",
        name,
        "--input-file",
        input_file,
        "--dataset",
        str(dataset),
        "--skip-existing",
    ]
    if metadata:
        command.extend(["--metadata", metadata])
    if map_service_type:
        command.extend(["--map-service-type", map_service_type])
    return command


def create_for_import(
    input_file: str,
    dataset: int,
) -> None:
    name = name_from_input_file(input_file)
    metadata = get_impacts_metadata(input_file=input_file)
    command = get_create_call(
        name,
        input_file,
        dataset,
        json.dumps(metadata),
    )
    subprocess.run(command)


def name_from_input_file(input_file: str):
    _base, name = input_file.rsplit("/", 1)
    return name.replace("_3857_COG.tif", "")


class Command(PlanscapeCommand):
    entity = "DataLayers"

    def add_subcommands(self, parser: CommandParser) -> None:
        subp = parser.add_subparsers()
        list_parser = subp.add_parser("list")
        create_parser = subp.add_parser("create")
        import_parser = subp.add_parser("import")
        report_parser = subp.add_parser("report")
        apply_style_parser = subp.add_parser("apply-style")
        apply_style_parser.add_argument(
            "--datalayer", type=int, required=True, default=None
        )
        apply_style_parser.add_argument(
            "--style", type=int, required=True, default=None
        )
        list_parser.add_argument(
            "--name",
            type=str,
            required=False,
            default=None,
        )
        list_parser.add_argument(
            "--dataset",
            type=int,
            required=False,
            default=None,
        )
        list_parser.add_argument(
            "--type",
            type=str,
            required=False,
            default=None,
        )
        create_mutex = create_parser.add_mutually_exclusive_group(required=True)
        create_mutex.add_argument(
            "--input-file",
            type=str,
            help="Local path or s3://... to upload into Planscape",
        )
        create_mutex.add_argument(
            "--url", type=str, help="HTTP/HTTPS service URL for an external data source"
        )
        create_parser.add_argument("name", type=str)
        create_parser.add_argument(
            "--dataset",
            type=int,
            required=True,
        )
        create_parser.add_argument(
            "--category",
            type=int,
            required=False,
        )
        create_parser.add_argument(
            "--style",
            type=int,
            required=False,
        )
        create_parser.add_argument(
            "--map-service-type",
            type=str,
            required=True,
            dest="map_service_type",
            choices=[c.name for c in MapServiceChoices],
            help=f"REQUIRED. One of: {[c.name for c in MapServiceChoices]}",
        )
        create_parser.add_argument(
            "--metadata",
            required=False,
            type=json.loads,
        )
        for module_name in MODULE_HANDLERS.keys():
            create_parser.add_argument(
                f"--no-{module_name}",
                required=False,
                dest=f"no_{module_name}",
                action="store_true",
            )
        create_parser.add_argument(
            "--skip-existing",
            required=False,
            action="store_true",
            default=True,
        )
        create_parser.add_argument(
            "--layers",
            required=False,
            type=str,
        )
        create_parser.add_argument(
            "--layer-type",
            type=str,
            required=False,
            dest="layer_type",
            choices=[c.name for c in DataLayerType],
            help=f"Layer type, required if using --url. One of: {[c.name for c in DataLayerType]}",
        )
        import_parser.add_argument(
            "--dataset",
            type=int,
            required=True,
        )
        import_parser.add_argument(
            "--bucket",
            required=False,
            type=str,
            default="planscape-control-dev",
        )
        import_parser.add_argument(
            "--prefix",
            required=False,
            type=str,
            default="datalayers/1/",
        )
        import_parser.add_argument(
            "--ext-filter",
            required=False,
            type=str,
            default=".tif",
        )
        import_parser.add_argument(
            "--dry-run",
            required=False,
            default=False,
            action="store_true",
        )
        import_parser.add_argument(
            "--process-count",
            required=False,
            type=int,
            default=4,
        )

        list_parser.set_defaults(func=self.list)
        create_parser.set_defaults(func=self.create)
        import_parser.set_defaults(func=self.import_from_s3)
        report_parser.set_defaults(func=self.report)
        apply_style_parser.set_defaults(func=self.apply_style)

    def report(self, **kwargs) -> None:
        module_keys = tuple(MODULE_HANDLERS.keys())
        writer = csv.writer(self.stdout)
        writer.writerow(
            [
                "organization_id",
                "organization_name",
                "datalayer_id",
                "datalayer_name",
                "datalayer_url",
                "dataset_id",
                "dataset_name",
                "category",
                "status",
                "type",
                *module_keys,
            ]
        )
        base_url = f"{self.get_base_url()}admin/datasets/datalayer"

        datalayers = DataLayer.objects.select_related(
            "dataset",
            "category",
            "organization",
        ).order_by("id")
        for datalayer in datalayers:
            metadata = datalayer.metadata or {}
            modules = {}
            if isinstance(metadata, dict):
                modules = metadata.get("modules") or {}
            if not isinstance(modules, dict):
                modules = {}

            writer.writerow(
                [
                    datalayer.organization_id,
                    datalayer.organization.name if datalayer.organization else "",
                    datalayer.id,
                    datalayer.name,
                    f"{base_url}/{datalayer.id}/change",
                    datalayer.dataset_id,
                    datalayer.dataset.name,
                    datalayer.category.name if datalayer.category else "",
                    datalayer.status,
                    datalayer.type,
                    *[module in modules for module in module_keys],
                ]
            )

    def apply_style(self, **kwargs):
        response = self._apply_style_request(**kwargs)
        data = response.json()
        self.stdout.write(
            f"Style {data['style']['name']} applied to {data['datalayer']['name']}"
        )
        pprint(data)

    def _list_filters(self, **kwargs):
        possible_filters = {
            "name": "name__icontains",
            "dataset": "dataset",
            "type": "type",
        }
        filters = {}
        for argument, filter in possible_filters.items():
            value = kwargs.get(argument, None) or None
            if value:
                filters[filter] = value

        return urlencode(filters)

    def _list_request(
        self,
        token,
        **kwargs,
    ) -> requests.Response:
        base_url = self.get_base_url(**kwargs)
        list_url = base_url + "/v2/admin/datalayers"
        headers = self.get_headers(token, **kwargs)
        filters = self._list_filters(**kwargs)
        if filters:
            list_url = f"{list_url}?{filters}"
        response = requests.get(
            list_url,
            headers=headers,
        )
        response.raise_for_status()
        return response

    def list(self, token, **kwargs):
        response = self._list_request(token, **kwargs)
        data = response.json()
        self.stdout.write(f"Found {data['count']} {self.entity}:")
        pprint(data)

    def create(self, **kwargs) -> None:
        if kwargs.get("url") and not kwargs.get("layer_type"):
            raise ValueError("--layer-type is required when using --url")
        try:
            pprint(self._create_datalayer(**kwargs))
        except Exception as ex:
            self.stderr.write(f"ERROR: {kwargs =}\nEXCEPTION: {ex =}")

    def _upload_file(self, input_files, datalayer, upload_to):
        upload_to_url = upload_to.get("url")
        upload_url_path = Path(datalayer.get("url"))
        object_name = "/".join(upload_url_path.parts[2:])
        if "s3.amazonaws.com" in upload_to_url:
            return upload_to_s3(
                object_name=object_name,
                input_file=input_files[0],
                upload_to=upload_to,
            )
        elif "storage.googleapis.com" in upload_to_url:
            return upload_to_gcs(
                object_name=object_name,
                input_file=input_files[0],
                url=upload_to_url,
            )

    def _apply_style_request(
        self,
        datalayer: int,
        style: int,
        **kwargs,
    ):
        base_url = self.get_base_url(**kwargs)
        url = base_url + f"/v2/admin/datalayers/{datalayer}/apply_style/"
        headers = self.get_headers(**kwargs)
        input_data = {"record": style}
        response = requests.post(
            url,
            headers=headers,
            json=input_data,
        )
        return response

    def _merge_metadata(
        self, metadata: Dict[str, Any], excluded_modules: List[str]
    ) -> Dict[str, Any]:
        breakpoint()

        modules = metadata.get("modules") or {}
        merged_modules: Dict[str, Dict[str, Any]] = {}
        remaining_modules = [
            module
            for module in MODULE_HANDLERS.keys()
            if module not in excluded_modules
        ]
        for module_name in remaining_modules:
            user_options = modules.get(module_name, {})
            if not isinstance(user_options, dict):
                user_options = {}
            merged_modules[module_name] = {"enabled": True, **user_options}
        metadata["modules"] = merged_modules
        return metadata

    def _create_datalayer_request(
        self,
        name: str,
        dataset: int,
        org: int,
        layer_type: str,
        geometry_type: str,
        layer_info: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None,
        map_service_type: Optional[str] = None,
        url: str | None = None,
        **kwargs,
    ) -> Response:
        base_url = self.get_base_url(**kwargs)
        request_url = base_url + "/v2/admin/datalayers/"
        headers = self.get_headers(**kwargs)
        mimetype = kwargs.get("mimetype")
        original_name = kwargs.get("original_name")
        category = kwargs.get("category")
        metadata = metadata or {}
        style = kwargs.get("style", None) or None
        input_data = {
            "organization": org,
            "name": name,
            "dataset": dataset,
            "category": category,
            "type": layer_type,
            "info": layer_info,
            "metadata": metadata,
            "original_name": original_name,
            "mimetype": mimetype,
            "geometry_type": geometry_type,
            "style": style,
            "map_service_type": map_service_type,
            "url": url,
        }

        response = requests.post(
            request_url,
            headers=headers,
            json=input_data,
        )
        return response

    def _datalayer_exists(self, token, **kwargs) -> bool:
        response = self._list_request(token, **kwargs)
        data = response.json()

        return data.get("count") > 0

    def _skip_existing(self, **kwargs):
        if self._datalayer_exists(**kwargs):
            kwargs.pop("token")
            raise DataLayerAlreadyExists(f"DataLayer with {kwargs = } already exists")

    def _create_datalayer(
        self,
        name: str,
        dataset: int,
        org: int,
        input_file: str | None,
        skip_existing: bool,
        url: str | None = None,
        **kwargs,
    ) -> Optional[Dict[str, Any]]:
        map_service_type = kwargs.pop("map_service_type", None)
        excluded_modules = []
        for module_name in MODULE_HANDLERS.keys():
            if kwargs.pop(f"no_{module_name}", False):
                excluded_modules.append(module_name)

        metadata = kwargs.pop("metadata", {}) or {}
        metadata = self._merge_metadata(
            metadata,
            excluded_modules,
        )
        layer_type = kwargs.pop("layer_type", None)
        if url and not layer_type:
            raise ValueError("Missing required layer_type when using url.")
        cloud_storage_file = is_s3_file(input_file) or is_gcs_file(input_file)
        original_file_path = Path(input_file)
        vsi_input_file = with_vsi_prefix(input_file)

        layer_type = fetch_datalayer_type(input_file=vsi_input_file)
        layer_type, layer_info = get_layer_info(input_file=vsi_input_file)
        mimetype = detect_mimetype(input_file=vsi_input_file)
        try:
            if skip_existing:
                check_existing_args = {
                    "token": kwargs.get("token"),
                    "env": kwargs.get("env"),
                    "dataset": dataset,
                    "name": name,
                }
                self._skip_existing(**check_existing_args)
        except DataLayerAlreadyExists as datalayer_exists:
            return {"info": str(datalayer_exists)}

        if url:
            response = self._create_datalayer_request(
                name=name,
                dataset=dataset,
                org=org,
                layer_type=layer_type,
                geometry_type="NO_GEOM",
                layer_info={},
                metadata=metadata,
                map_service_type=map_service_type,
                url=url,
                mimetype=None,
                original_name=None,
                **kwargs,
            )
            try:
                return response.json()
            except JSONDecodeError:
                return {"error": str(response.text)}

        match layer_type:
            case DataLayerType.RASTER:
                processed_files = to_planscape_raster(
                    input_file=input_file,
                )

            case _:
                if len(layer_info.keys()) > 1:
                    # multi-layer vector file
                    layers = kwargs.get("layers", "")
                    layers = layers.split(",") if layers else None
                    processed_files = to_planscape_multi_layer(
                        input_file=input_file,
                        target_layers=layers,
                    )
                    for layer_name, layer_file in processed_files:
                        command = get_create_call(
                            name=layer_name,
                            input_file=layer_file,
                            dataset=dataset,
                            metadata=metadata,
                            map_service_type=map_service_type,
                        )
                        subprocess.run(command)
                    return None
                else:
                    # single-layer vector file
                    processed_files = [input_file]

        geometry_type = fetch_geometry_type(layer_type=layer_type, info=layer_info)
        if cloud_storage_file:
            original_name = input_file
        else:
            original_name = original_file_path.name
            file_metadata = get_and_parse_datalayer_file_metadata(
                file_path=original_file_path
            )
            if file_metadata:
                metadata.update({"metadata": file_metadata})

        output_data = {}
        try:
            response = self._create_datalayer_request(
                name=name,
                dataset=dataset,
                org=org,
                layer_type=layer_type,
                geometry_type=geometry_type,
                layer_info=layer_info,
                mimetype=mimetype,
                original_name=original_name,
                metadata=metadata,
                map_service_type=map_service_type,
                url=url,
                **kwargs,
            )
            output_data = response.json()
        except JSONDecodeError:
            print(f"[ERROR]\n{response.text}")
            raise

        if not output_data:
            raise ValueError("request failed.")
        datalayer = output_data.get("datalayer")
        upload_to = output_data.get("upload_to", {}) or {}

        if url or len(upload_to) == 0:
            return output_data

        if len(upload_to.keys()) > 0:
            self._upload_file(
                processed_files,
                datalayer=datalayer,
                upload_to=upload_to,
            )
            self._change_datalayer_status_request(
                org=org,
                datalayer_id=datalayer["id"],
                status="READY",
                **kwargs,
            )
        return output_data

    def _name_from_input_file(self, input_file: str):
        _base, name = input_file.rsplit("/", 1)
        return name.replace("_3857_COG.tif", "")

    def import_from_s3(
        self,
        dataset: int,
        bucket: str,
        prefix: str,
        ext_filter: str,
        dry_run: bool,
        process_count: int,
        **kwargs,
    ) -> None:
        files = list_files(
            bucket=bucket,
            prefix=prefix,
            extension=ext_filter,
        )
        s3_files = list(
            map(
                lambda file: f"s3://{bucket}/{file}",
                files,
            )
        )
        if dry_run:
            for f in s3_files:
                pprint(f)
            return
        fn = partial(
            create_for_import,
            dataset=dataset,
        )
        with multiprocessing.Pool(process_count) as pool:
            _ = pool.map(
                fn,
                s3_files,
            )

    def _change_datalayer_status_request(
        self,
        org: int,
        datalayer_id: int,
        status: str,
        **kwargs,
    ):
        base_url = self.get_base_url(**kwargs)
        url = f"{base_url}/v2/admin/datalayers/{datalayer_id}/change_status/"
        headers = self.get_headers(**kwargs)
        response = requests.post(
            url,
            headers=headers,
            json={
                "organization": org,
                "status": status,
            },
        )
        if not response.ok:
            raise Exception(
                f"Failed to set datalayer {datalayer_id} to {status}. "
                f"Response: {response.status_code} => {response.text}"
            )
        data = response.json()
        return data
