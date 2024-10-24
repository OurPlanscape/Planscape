import json
from pathlib import Path
from pprint import pprint
from typing import Any, Dict, Optional
from django.core.management.base import CommandParser
import requests
from core.base_commands import PlanscapeCommand
from core.s3 import upload_file
from datasets.models import DataLayerType
from gis.core import fetch_datalayer_type, fetch_geometry_type, get_layer_info
from gis.info import info_raster, info_vector
from gis.errors import InvalidFileFormat
from gis.io import detect_mimetype
from gis.rasters import to_planscape


class Command(PlanscapeCommand):
    entity = "DataLayers"

    def add_subcommands(self, parser: CommandParser) -> None:
        subp = parser.add_subparsers()
        list_parser = subp.add_parser("list")
        create_parser = subp.add_parser("create")
        create_parser.add_argument("name", type=str)
        create_parser.add_argument(
            "--dataset",
            type=int,
            required=True,
        )
        create_parser.add_argument(
            "--input-file",
            required=True,
            type=str,
        )
        list_parser.set_defaults(func=self.list)
        create_parser.set_defaults(func=self.create)

    def list(self, token, **kwargs):
        base_url = self.get_base_url(**kwargs)
        list_url = base_url + "/v2/datalayers"
        headers = self.get_headers(token, **kwargs)
        response = requests.get(
            list_url,
            headers=headers,
        )
        data = response.json()
        self.stdout.write(f"Found {data['count']} {self.entity}:")
        pprint(data)

    def create(self, **kwargs) -> None:
        pprint(self._create_datalayer(**kwargs))

    def _upload_file(self, rasters, datalayer, upload_to) -> requests.Response:
        upload_url_path = Path(datalayer.get("url"))
        object_name = "/".join(upload_url_path.parts[2:])
        return upload_file(
            object_name=object_name,
            input_file=rasters[0],
            upload_to=upload_to,
        )

    def _create_datalayer_request(
        self,
        name: str,
        dataset: int,
        org: int,
        layer_type: str,
        geometry_type: str,
        layer_info: Dict[str, Any],
        **kwargs,
    ) -> Optional[Dict[str, Any]]:
        base_url = self.get_base_url(**kwargs)
        url = base_url + "/v2/datalayers/"
        headers = self.get_headers(**kwargs)
        mimetype = kwargs.get("mimetype")
        original_name = kwargs.get("original_name")
        input_data = {
            "organization": org,
            "name": name,
            "dataset": dataset,
            "type": layer_type,
            "info": layer_info,
            "original_name": original_name,
            "mimetype": mimetype,
            "geometry_type": geometry_type,
        }
        response = requests.post(
            url,
            headers=headers,
            json=input_data,
        )
        return response.json()

    def _create_datalayer(
        self,
        name: str,
        dataset: int,
        org: int,
        input_file: str,
        **kwargs,
    ) -> Optional[Dict[str, Any]]:
        original_file_path = Path(input_file)
        layer_type = fetch_datalayer_type(input_file=input_file)
        rasters = to_planscape(input_file=input_file)
        layer_info = get_layer_info(input_file=rasters[0])
        geometry_type = fetch_geometry_type(layer_type=layer_type, info=layer_info)
        mimetype = detect_mimetype(input_file=input_file)
        original_name = original_file_path.name
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
            **kwargs,
        )
        if not output_data:
            raise ValueError("request failed.")
        datalayer = output_data.get("datalayer")
        upload_to = output_data.get("upload_to")
        self._upload_file(
            rasters,
            datalayer=datalayer,
            upload_to=upload_to,
        )
        return output_data
