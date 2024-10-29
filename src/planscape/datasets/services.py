import logging
import mimetypes
from pathlib import Path
from uuid import uuid4
from django.db import transaction
from django.contrib.gis.geos import Polygon, GEOSGeometry
from django.conf import settings
from typing import Any, Dict, Optional
from actstream import action
from core.s3 import create_upload_url, is_s3_file
from datasets.models import DataLayer, Category, DataLayerType, Dataset, GeometryType

log = logging.getLogger(__name__)


def get_object_name(
    organization_id: int,
    uuid: str,
    original_name: Optional[str] = None,
    mimetype: Optional[str] = None,
) -> str:
    extension = ""
    if mimetype:
        extension = mimetypes.guess_extension(mimetype)
    if original_name:
        original_file = Path(original_name)
        extension = original_file.suffix
    return f"{settings.DATALAYERS_FOLDER}/{organization_id}/{uuid}{extension}"


def get_storage_url(
    organization_id: int,
    uuid: str,
    original_name: str,
    mimetype: Optional[str] = None,
) -> str:
    if is_s3_file(original_name):
        return original_name
    return f"s3://{settings.S3_BUCKET}/{get_object_name(organization_id, uuid, original_name, mimetype)}"


def create_upload_url_for_org(
    organization_id: int,
    uuid: str,
    original_name: str,
    mimetype: Optional[str] = None,
) -> Dict[str, Any]:
    if is_s3_file(original_name):
        log.info("The file is already in S3. No need to create a new URL.")
        return {}
    object_name = get_object_name(
        organization_id,
        uuid,
        original_name,
        mimetype,
    )
    upload_url_response = create_upload_url(
        bucket_name=settings.S3_BUCKET,
        object_name=object_name,
        expiration=settings.UPLOAD_EXPIRATION_TTL,
    )
    if not upload_url_response:
        raise ValueError("Could not create upload url.")

    return upload_url_response


def geometry_from_info(
    info: Optional[Dict[str, Any]],
    datalayer_type: DataLayerType = DataLayerType.RASTER,
) -> Optional[Polygon]:
    if not info:
        return None
    match datalayer_type:
        case DataLayerType.RASTER:
            x0, y0, x1, y1 = info.get("bounds", [])
            _epsg, srid = info.get("crs", "").split(":")
            return GEOSGeometry(
                Polygon(((x0, y0), (x0, y1), (x1, y1), (x1, y0), (x0, y0))),
                srid=int(srid),
            ).transform(
                settings.CRS_INTERNAL_REPRESENTATION,
                clone=True,
            )
        case _:
            log.warning("Not yet implemented for vectors.")
            return None


@transaction.atomic()
def create_datalayer(
    name: str,
    dataset: Dataset,
    organization,
    created_by,
    category: Optional[Category] = None,
    type: Optional[DataLayerType] = None,
    geometry_type: Optional[GeometryType] = None,
    info: Optional[Dict[str, Any]] = None,
    original_name: Optional[str] = None,
    mimetype: Optional[str] = None,
    **kwargs,
) -> Dict[str, Any]:
    metadata = kwargs.get("metadata", None) or None
    uuid = str(uuid4())
    storage_url = get_storage_url(
        organization_id=organization.pk,
        uuid=uuid,
        original_name=original_name,
        mimetype=mimetype,
    )
    geometry = geometry_from_info(info)

    datalayer = DataLayer.objects.create(
        name=name,
        uuid=uuid,
        dataset=dataset,
        created_by=created_by,
        organization=organization,
        category=category,
        url=storage_url,
        metadata=metadata,
        type=type,
        geometry_type=geometry_type,
        geometry=geometry,
        info=info,
        original_name=original_name,
        mimetype=mimetype,
        **kwargs,
    )
    upload_to = create_upload_url_for_org(
        organization_id=organization.pk,
        uuid=uuid,
        original_name=original_name,
        mimetype=mimetype,
    )
    action.send(created_by, verb="created", action_object=datalayer)
    return {
        "datalayer": datalayer,
        "upload_to": upload_to,
    }
