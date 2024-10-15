from pathlib import Path
from pprint import pprint
from typing import Any, Dict, Optional
from django.core.management.base import CommandParser
import requests
from core.base_commands import PlanscapeCommand
from core.s3 import upload_file
from datasets.models import DataLayerType
from gis.core import fetch_datalayer_type, fetch_geometry_type
from gis.info import info_raster, info_vector
from gis.errors import InvalidFileFormat
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
            type=str,
            required=True,
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

    def _upload_file(self, rasters, datalayer, upload_to) -> bool:
        upload_url_path = Path(datalayer.get("url"))
        object_name = "/".join(upload_url_path.parts[2:])
        upload_file(
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
        input_data = {
            "organization": org,
            "name": name,
            "dataset": dataset,
            "type": layer_type,
            "info": layer_info,
            "geometry_type": geometry_type,
        }
        response = requests.post(
            url,
            headers=headers,
            data=input_data,
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
        layer_type = fetch_datalayer_type(input_file=input_file)
        get_layer_info = (
            info_raster if layer_type == DataLayerType.RASTER else info_vector
        )
        layer_info = get_layer_info(input_file=input_file)
        geometry_type = fetch_geometry_type(layer_type=layer_type, info=layer_info)
        rasters = to_planscape(input_file=input_file)
        try:
            output_data = self._create_datalayer_request(
                name=name,
                dataset=dataset,
                org=org,
                layer_type=layer_type,
                geometry_type=geometry_type,
                layer_info=layer_info,
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
        except Exception:
            self.stderr.write("Something went wrong while talking to Planscape.")
            return
