import itertools
import json
import logging
import mimetypes
from pathlib import Path
from typing import Any, Dict, Optional
from uuid import uuid4

import mmh3
from actstream import action
from core.s3 import create_upload_url, is_s3_file, s3_filename
from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.gis.geos import GEOSGeometry, Polygon
from django.db import transaction
from organizations.models import Organization

from datasets.models import (
    Category,
    DataLayer,
    DataLayerHasStyle,
    DataLayerType,
    Dataset,
    GeometryType,
    SearchResult,
    Style,
)
from datasets.search import (
    category_to_search_result,
    datalayer_to_search_result,
    dataset_to_search_result,
    organization_to_search_result,
)

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
def create_style(
    name: str,
    organization: Organization,
    created_by: User,
    type: DataLayerType,
    data: Dict[str, Any],
    **kwargs,
) -> Dict[str, Any]:
    data_hash = mmh3.hash_bytes(json.dumps(data)).hex()
    hash_already_exists = Style.objects.filter(
        organization=organization,
        data_hash=data_hash,
    ).exists()
    style = Style.objects.create(
        name=name,
        organization=organization,
        created_by=created_by,
        type=type,
        data=data,
        data_hash=data_hash,
    )
    action.send(created_by, verb="created", action_object=style)
    return {"style": style, "possibly_exists": hash_already_exists}


@transaction.atomic()
def assign_style(
    created_by: User,
    style: Style,
    datalayer: DataLayer,
) -> DataLayerHasStyle:
    if style.type != datalayer.type:
        raise ValueError("Cannot associate a style of different types.")

    try:
        previous_association = DataLayerHasStyle.objects.select_for_update().get(
            style=style, datalayer=datalayer
        )
        previous_association.delete()
    except DataLayerHasStyle.DoesNotExist:
        pass

    datalayer_has_style = DataLayerHasStyle.objects.create(
        style=style,
        datalayer=datalayer,
        default=True,
    )
    action.send(
        created_by,
        verb="assigned",
        action_object=datalayer,
        target=style,
    )

    return datalayer_has_style


@transaction.atomic()
def create_datalayer(
    name: str,
    dataset: Dataset,
    organization: Organization,
    created_by: User,
    original_name: str,
    category: Optional[Category] = None,
    type: Optional[DataLayerType] = None,
    geometry_type: Optional[GeometryType] = None,
    info: Optional[Dict[str, Any]] = None,
    mimetype: Optional[str] = None,
    **kwargs,
) -> Dict[str, Any]:
    metadata = kwargs.pop("metadata", None) or None
    style = kwargs.pop("style", None) or None
    uuid = str(uuid4())
    storage_url = get_storage_url(
        organization_id=organization.pk,
        uuid=uuid,
        original_name=original_name,
        mimetype=mimetype,
    )
    geometry = geometry_from_info(info)
    if is_s3_file(original_name):
        # process this
        original_file_name = s3_filename(original_name)
    else:
        original_file_name = original_name
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
        original_name=original_file_name,
        mimetype=mimetype,
        **kwargs,
    )
    upload_to = create_upload_url_for_org(
        organization_id=organization.pk,
        uuid=uuid,
        original_name=original_name,
        mimetype=mimetype,
    )

    if style:
        assign_style(
            created_by=created_by,
            style=style,
            datalayer=datalayer,
        )

    action.send(created_by, verb="created", action_object=datalayer)
    return {
        "datalayer": datalayer,
        "upload_to": upload_to,
    }


def find_anything(term: str) -> Dict[str, SearchResult]:
    raw_results = [
        [
            organization_to_search_result(x)
            for x in Organization.objects.filter(name__icontains=term)
        ],
        [
            dataset_to_search_result(x)
            for x in Dataset.objects.filter(name__icontains=term)
        ],
        [
            category_to_search_result(x)
            for x in Category.objects.filter(name__icontains=term)
        ],
        [
            datalayer_to_search_result(x)
            for x in DataLayer.objects.filter(name__icontains=term)
        ],
    ]
    search_results = itertools.chain.from_iterable(raw_results)
    results = {}
    for search_result in search_results:
        match search_result:
            case list() as search_result:
                for match in search_result:
                    key = match.key()
                    if key in results:
                        continue
                    results[key] = match
            case _:
                key = search_result.key()
                if key in results:
                    continue
                results[key] = search_result

    return results
