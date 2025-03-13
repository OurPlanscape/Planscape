import json
import multiprocessing
import re
import subprocess
import logging
from functools import partial
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode
from xml.etree import ElementTree

import requests
from core.base_commands import PlanscapeCommand
from core.pprint import pprint
from core.s3 import is_s3_file, list_files, upload_file
from django.core.management.base import CommandParser
from gis.core import fetch_datalayer_type, fetch_geometry_type, get_layer_info
from gis.io import detect_mimetype
from gis.rasters import to_planscape
from pygeometa.schemas import load_schema, SCHEMAS

logger = logging.getLogger(__name__)


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


def get_create_call(name, input_file, dataset, metadata) -> List[str]:
    return [
        "python3",
        "manage.py",
        "datalayers",
        "create",
        name,
        "--input-file",
        input_file,
        "--dataset",
        str(dataset),
        "--metadata",
        metadata,
        "--skip-existing",
    ]


def create_for_import(input_file: str, dataset: int) -> None:
    name = name_from_input_file(input_file)
    metadata = get_impacts_metadata(input_file=input_file)
    command = get_create_call(name, input_file, dataset, json.dumps(metadata))
    subprocess.run(command)


def name_from_input_file(input_file: str):
    _base, name = input_file.rsplit("/", 1)
    return name.replace("_3857_COG.tif", "")


def get_item_text_or_none(
    element: Optional[ElementTree.Element], tag: str
) -> Optional[str]:
    return element.find(tag).text if element and element.find(tag) else None


def parse_qmd_metadata(metadata_file: Path) -> Optional[Dict[str, Any]]:
    with metadata_file.open() as f:
        try:
            root = ElementTree.fromstring(f.read())
            metadata = {
                "metadata": {
                    "identifier": get_item_text_or_none(root, "identifier"),
                    "parentidentifier": get_item_text_or_none(root, "parentidentifier"),
                    "hierarchylevel": get_item_text_or_none(root, "type"),
                    "language": get_item_text_or_none(root, "language"),
                },
            }

            identification = {
                "language": get_item_text_or_none(root, "language"),
                "title": get_item_text_or_none(root, "title"),
                "abstract": get_item_text_or_none(root, "abstract"),
                "fees": get_item_text_or_none(root, "fees"),
                "accessconstraints": get_item_text_or_none(root, "constraints"),
                "license": {"name": get_item_text_or_none(root, "license")},
            }
            keywords_tree = root.find("keywords")
            keywords = []
            if keywords_tree:
                for keyword in keywords_tree.iter():
                    keywords.append(keyword.text)

            if keywords:
                identification.update({"keywords": {"default": {"keywords": keywords}}})

            extents = {}
            extent_tree = root.find("extent")
            if extent_tree:
                spatial = extent_tree.find("spatial")
                temporal = extent_tree.find("temporal")
                if spatial:
                    extents.update({"spatial": [spatial.attrib]})
                if temporal:
                    extents.update(
                        {
                            "temporal": [
                                {
                                    "begin": temporal.get("start"),
                                    "end": temporal.get("end"),
                                }
                            ]
                        }
                    )

            if extents:
                identification.update({"extents": extents})

            metadata.update({"identification": identification})

            contact_tree = root.find("contact")
            if contact_tree:
                address_tree = contact_tree.find("contactAddress")
                contact = {
                    "name": get_item_text_or_none(contact_tree, "name"),
                    "organization": get_item_text_or_none(contact_tree, "organization"),
                    "position": get_item_text_or_none(contact_tree, "position"),
                    "voice": get_item_text_or_none(contact_tree, "voice"),
                    "fax": get_item_text_or_none(contact_tree, "fax"),
                    "email": get_item_text_or_none(contact_tree, "email"),
                    "role": get_item_text_or_none(contact_tree, "role"),
                    "city": get_item_text_or_none(address_tree, "city"),
                    "address": get_item_text_or_none(address_tree, "address"),
                    "postalcode": get_item_text_or_none(address_tree, "postalcode"),
                    "country": get_item_text_or_none(address_tree, "country"),
                }
                metadata.update({"contact": contact})

            links = root.find("links")
            distribution = {}
            if links:
                for link in links.iter():
                    distribution.update({link.get("name"): link.attrib})
            if distribution:
                metadata.update({"distribution": distribution})

            crs_tree = root.find("crs")
            spatialrefsys_tree = crs_tree.find("spatialrefsys") if crs_tree else None
            if spatialrefsys_tree:
                spatial_ref = {
                    element.tag: element.text for element in spatialrefsys_tree.iter()
                }
                metadata.update({"crs": {"spatialrefsys": spatial_ref}})  # type: ignore

        except Exception:
            logger.warning(
                f"Failed to parse {metadata_file.name} with QMD schema.",
                exc_info=True,
            )

    return None


def parse_xml_metadata(metadata_file: Path) -> Optional[Dict[str, Any]]:
    with metadata_file.open() as f:
        for schema in SCHEMAS.keys():
            try:
                schema_object = load_schema(schema)
                metadata = schema_object.import_(f.read())
                metadata.pop("mfc")
                return metadata
            except Exception:
                logger.warning(
                    f"Failed to parse {metadata_file.name} with {schema}.",
                    exc_info=True,
                )

    return None


def parse_metadata(metadata_file: Path) -> Optional[Dict[str, Any]]:
    match metadata_file.suffix:
        case ".qmd":
            metadata = parse_qmd_metadata(metadata_file)
        case _:
            metadata = parse_xml_metadata(metadata_file)

    return metadata


def get_datalayer_metadata(file_path: Path) -> Optional[Dict[str, Any]]:
    for ext in [".xml", ".aux.xml", ".qmd"]:
        metadata_file = file_path.with_suffix(ext)
        if metadata_file.exists():
            return parse_metadata(metadata_file)

    return None


class Command(PlanscapeCommand):
    entity = "DataLayers"

    def add_subcommands(self, parser: CommandParser) -> None:
        subp = parser.add_subparsers()
        list_parser = subp.add_parser("list")
        create_parser = subp.add_parser("create")
        import_parser = subp.add_parser("import")
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
            "--input-file",
            required=True,
            type=str,
        )
        create_parser.add_argument(
            "--metadata",
            required=False,
            type=json.loads,
        )
        create_parser.add_argument(
            "--skip-existing",
            required=False,
            action="store_true",
            default=True,
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
        apply_style_parser.set_defaults(func=self.apply_style)

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
        return requests.get(
            list_url,
            headers=headers,
        )

    def list(self, token, **kwargs):
        response = self._list_request(token, **kwargs)
        data = response.json()
        self.stdout.write(f"Found {data['count']} {self.entity}:")
        pprint(data)

    def create(self, **kwargs) -> None:
        try:
            pprint(self._create_datalayer(**kwargs))
        except Exception as ex:
            self.stderr.write(f"ERROR: {kwargs =}\nEXCEPTION: {ex =}")

    def _upload_file(self, rasters, datalayer, upload_to) -> requests.Response:
        upload_url_path = Path(datalayer.get("url"))
        object_name = "/".join(upload_url_path.parts[2:])
        return upload_file(
            object_name=object_name,
            input_file=rasters[0],
            upload_to=upload_to,
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

    def _create_datalayer_request(
        self,
        name: str,
        dataset: int,
        org: int,
        layer_type: str,
        geometry_type: str,
        layer_info: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs,
    ) -> Optional[Dict[str, Any]]:
        base_url = self.get_base_url(**kwargs)
        url = base_url + "/v2/admin/datalayers/"
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
        }
        response = requests.post(
            url,
            headers=headers,
            json=input_data,
        )
        return response.json()

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
        input_file: str,
        skip_existing: bool,
        **kwargs,
    ) -> Optional[Dict[str, Any]]:
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

        s3_file = is_s3_file(input_file)
        original_file_path = Path(input_file)
        layer_type = fetch_datalayer_type(input_file=input_file)
        rasters = to_planscape(
            input_file=input_file,
        )
        layer_info = get_layer_info(input_file=rasters[0])
        geometry_type = fetch_geometry_type(layer_type=layer_type, info=layer_info)
        mimetype = detect_mimetype(input_file=input_file)
        metadata = kwargs.pop("metadata", None)
        if s3_file:
            original_name = input_file
        else:
            original_name = original_file_path.name
            file_metadata = get_datalayer_metadata(file_path=original_file_path)
            if file_metadata:
                metadata.update({"metadata": file_metadata})

        # updated info
        output_data = self._create_datalayer_request(
            name=name,
            dataset=dataset,
            org=org,
            layer_type=layer_type,
            geometry_type=geometry_type,
            layer_info=layer_info,
            mimetype=mimetype,
            original_name=original_name,
            metadata=metadata,
            **kwargs,
        )
        if not output_data:
            raise ValueError("request failed.")
        datalayer = output_data.get("datalayer")
        upload_to = output_data.get("upload_to", {}) or {}
        if len(upload_to.keys()) > 0:
            self._upload_file(
                rasters,
                datalayer=datalayer,
                upload_to=upload_to,
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
        fn = partial(create_for_import, dataset=dataset)
        with multiprocessing.Pool(process_count) as pool:
            _ = pool.map(
                fn,
                s3_files,
            )
