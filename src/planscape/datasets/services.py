import itertools
import json
import logging
import mimetypes
from pathlib import Path
from typing import Any, Collection, Dict, Optional
from uuid import uuid4

import mmh3
from actstream import action
from cacheops import cached, invalidate_model
from core.flags import feature_enabled
from core.gcs import create_upload_url as create_upload_url_gcs
from core.gcs import is_gcs_file
from core.s3 import create_upload_url as create_upload_url_s3
from core.s3 import is_s3_file, s3_filename
from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.gis.geos import GEOSGeometry, Polygon
from django.db import connection, transaction
from django.db.models import QuerySet
from gis.geometry import geodjango_to_multi, to_geodjango_geometry
from gis.rasters import get_estimated_mask as get_estimated_mask_raster
from modules.base import get_module
from organizations.models import Organization
from planscape.openpanel import track_openpanel

from datasets.models import (
    Category,
    DataLayer,
    DataLayerHasStyle,
    DataLayerStatus,
    DataLayerType,
    Dataset,
    GeometryType,
    PreferredDisplayType,
    SearchResult,
    StorageTypeChoices,
    Style,
    VisibilityOptions,
)
from datasets.search import datalayer_to_search_result, dataset_to_search_result
from datasets.tasks import datalayer_uploaded

log = logging.getLogger(__name__)


def get_bucket_url() -> str:
    """Returns the bucket URL based on the current provider."""
    if settings.PROVIDER == "gcp":
        return f"gs://{settings.GCS_BUCKET}"
    return f"s3://{settings.S3_BUCKET}"


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
    if is_s3_file(original_name) or is_gcs_file(original_name):
        return original_name
    return f"{get_bucket_url()}/{get_object_name(organization_id, uuid, original_name, mimetype)}"


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
    upload_url_response = None
    match settings.PROVIDER:
        case "gcp":
            upload_url_response = create_upload_url_gcs(
                object_name=object_name,
            )
        case _:
            upload_url_response = create_upload_url_s3(
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
            bounds = info.get("bounds", [])
            _epsg, srid = info.get("crs", "").split(":")
        case _:
            first_layer = list(info.keys())[0]
            bounds = info.get(first_layer, {}).get("bounds", [])
            _epsg, srid = info.get(first_layer, {}).get("crs", "").split(":")

    x0, y0, x1, y1 = bounds
    return GEOSGeometry(
        Polygon(((x0, y0), (x0, y1), (x1, y1), (x1, y0), (x0, y0))),
        srid=int(srid),
    ).transform(
        settings.DEFAULT_CRS,
        clone=True,
    )  # type: ignore


@transaction.atomic()
def create_dataset(
    name: str,
    organization: Organization,
    created_by: User,
    description: Optional[str] = None,
    visibility: VisibilityOptions = VisibilityOptions.PUBLIC,
    version: Optional[str] = None,
    **kwargs,
) -> Dataset:
    dataset = Dataset.objects.create(
        name=name,
        organization=organization,
        created_by=created_by,
        description=description,
        visibility=visibility,
        version=version,
    )
    invalidate_model(Dataset)
    track_openpanel(
        name="datasets.dataset.created",
        properties={
            "organization_id": organization.pk,
            "organization_name": organization.name,
            "visibility": visibility,
            "email": created_by.email if created_by else None,
        },
        user_id=created_by.pk,
    )
    return dataset


@transaction.atomic()
def create_style(
    name: str,
    organization: Organization,
    created_by: User,
    type: DataLayerType,
    data: Dict[str, Any],
    datalayers: Optional[Collection[DataLayer]] = None,
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
    track_openpanel(
        name="datasets.style.created",
        properties={
            "organization_id": organization.pk,
            "organization_name": organization.name,
            "type": type,
            "email": created_by.email if created_by else None,
        },
        user_id=created_by.pk,
    )
    if datalayers:
        for datalayer in datalayers:
            assign_style(created_by=created_by, style=style, datalayer=datalayer)

    invalidate_model(Style)
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
    invalidate_model(DataLayer)
    track_openpanel(
        name="datasets.style.assigned",
        properties={
            "organization_id": style.organization.id,
            "organization_name": style.organization.name,
            "datalayer_id": datalayer.pk,
            "datalayer_name": datalayer.name,
            "dataset_id": datalayer.dataset.pk,
            "email": created_by.email if created_by else None,
        },
        user_id=created_by.pk,
    )
    return datalayer_has_style


DATALAYER_TRANSITIONS = {
    DataLayerStatus.PENDING: [DataLayerStatus.FAILED, DataLayerStatus.READY],
    DataLayerStatus.READY: [DataLayerStatus.READY],
    DataLayerStatus.FAILED: [DataLayerStatus.PENDING, DataLayerStatus.READY],
}


@transaction.atomic()
def change_datalayer_status(
    organization: Organization,
    user: User,
    datalayer: DataLayer,
    target_status: DataLayerStatus,
) -> DataLayer:
    possible = DATALAYER_TRANSITIONS[datalayer.status]
    if target_status not in possible:
        raise ValueError(
            f"Cannot transition from {datalayer.status} to {target_status}."
        )

    if target_status == DataLayerStatus.READY:
        # the status will be changed to READY after
        # datalayer uploaded is done
        datalayer_uploaded.delay(datalayer.pk, status=target_status)
    else:
        datalayer.status = target_status
        datalayer.save()

    action.send(user, verb="changed status", action_object=datalayer)
    invalidate_model(DataLayer)
    track_openpanel(
        name="datasets.datalayer.changed_status",
        properties={
            "organization_id": organization.pk,
            "organization_name": organization.name,
            "dataset_id": datalayer.dataset.pk,
            "dataset_name": datalayer.dataset.name,
            "email": user.email if user else None,
        },
        user_id=user.pk,
    )

    datalayer.refresh_from_db()
    return datalayer


@transaction.atomic()
def create_datalayer(
    name: str,
    dataset: Dataset,
    organization: Organization,
    created_by: User,
    original_name: Optional[str] = None,
    url: Optional[str] = None,
    storage_type: Optional[str] = None,
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
    geometry = geometry_from_info(
        info,
        datalayer_type=type,
    )
    outline = kwargs.pop("outline", None)

    if bool(url) == bool(original_name):
        raise ValueError(
            "Must provide exactly one of `url` (external) or `original_name` (file upload)."
        )

    if url:
        storage_url = url
        storage_type = StorageTypeChoices.EXTERNAL_SERVICE
        original_file_name = None
        upload_to = {}
        kwargs["status"] = DataLayerStatus.READY

    if original_name:
        storage_url = get_storage_url(
            organization_id=organization.pk,
            uuid=uuid,
            original_name=original_name,
            mimetype=mimetype,
        )

        if not mimetype:
            mimetype, _encoding = mimetypes.guess_type(original_name)
        if is_s3_file(original_name):
            original_file_name = s3_filename(original_name)
        else:
            original_file_name = original_name

        if storage_type is None:
            storage_type = (
                StorageTypeChoices.DATABASE
                if type == DataLayerType.VECTOR
                else StorageTypeChoices.FILESYSTEM
            )

        upload_to = create_upload_url_for_org(
            organization_id=organization.pk,
            uuid=uuid,
            original_name=original_name,
            mimetype=mimetype,
        )

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
        storage_type=storage_type,
        geometry_type=geometry_type,
        geometry=geometry,
        info=info,
        original_name=original_file_name,
        mimetype=mimetype,
        outline=outline,
        **kwargs,
    )

    if style:
        assign_style(
            created_by=created_by,
            style=style,
            datalayer=datalayer,
        )

    action.send(created_by, verb="created", action_object=datalayer)
    invalidate_model(DataLayer)
    track_openpanel(
        name="datasets.datalayer.created",
        properties={
            "organization_id": organization.pk,
            "organization_name": organization.name,
            "dataset_id": dataset.pk,
            "dataset_name": dataset.name,
            "email": created_by.email if created_by else None,
        },
        user_id=created_by.pk,
    )
    return {
        "datalayer": datalayer,
        "upload_to": upload_to,
    }


@cached(timeout=settings.BROWSE_DATASETS_TTL)
def browse(
    dataset: Dataset,
    type: Optional[DataLayerType] = None,
    module: Optional[str] = None,
    geometry: Optional[GEOSGeometry] = None,
) -> QuerySet[DataLayer]:
    datalayers = (
        DataLayer.objects.filter(
            dataset=dataset,
            status=DataLayerStatus.READY,
        )
        .select_related(
            "organization",
            "dataset",
            "category",
        )
        .prefetch_related("styles")
    )

    if type is not None:
        datalayers = datalayers.filter(type=type)

    if geometry is not None:
        datalayers = datalayers.filter(outline__intersects=geometry)

    if feature_enabled("BROWSE_WITH_MODULE"):
        if module:
            filter = {f"metadata__modules__{module}__enabled": True}
            datalayers = datalayers.filter(**filter)

    return datalayers


@cached(timeout=settings.FIND_ANYTHING_TTL)
def find_anything(
    term: str,
    type: DataLayerType,
    module: Optional[str] = None,
    geometry: Optional[GEOSGeometry] = None,
    **kwargs,
) -> Dict[str, SearchResult]:
    """
    Given a term, search for anything (datasets / datalayers)
    """
    layer_type = type or DataLayerType.RASTER
    if module:
        mod = get_module(module)
        preferred_display_type = (
            PreferredDisplayType.MAIN_DATALAYERS
            if layer_type == DataLayerType.RASTER
            else PreferredDisplayType.BASE_DATALAYERS
        )
        dataset_ids = [
            d.pk
            for d in mod.get_datasets()
            if d.preferred_display_type == preferred_display_type
        ]
    else:
        dataset_ids = None

    datalayer_filter: Dict[str, Any] = {
        "name__icontains": term,
        "dataset__visibility": VisibilityOptions.PUBLIC,
        "status": DataLayerStatus.READY,
        "type": layer_type,
    }
    category_filter: Dict[str, Any] = {
        "category__name__icontains": term,
        "dataset__visibility": VisibilityOptions.PUBLIC,
        "status": DataLayerStatus.READY,
        "type": layer_type,
    }
    dataset_filter: Dict[str, Any] = {
        "name__icontains": term,
        "visibility": VisibilityOptions.PUBLIC,
    }
    org_filter: Dict[str, Any] = {
        "organization__name__icontains": term,
        "visibility": VisibilityOptions.PUBLIC,
    }

    if feature_enabled("FIND_ANYTHING_WITH_MODULE"):
        datalayer_filter[f"metadata__modules__{module}__enabled"] = True
        category_filter[f"metadata__modules__{module}__enabled"] = True

    if dataset_ids:
        datalayer_filter["dataset_id__in"] = dataset_ids
        category_filter["dataset__id__in"] = dataset_ids
        dataset_filter["id__in"] = dataset_ids
        org_filter["id__in"] = dataset_ids

    if geometry:
        datalayer_filter["outline__intersects"] = geometry
        category_filter["outline__intersects"] = geometry

    raw_results = [
        [
            dataset_to_search_result(x)
            for x in Dataset.objects.filter(
                **org_filter,
            )
        ],
        [
            dataset_to_search_result(x)
            for x in Dataset.objects.filter(
                **dataset_filter,
            )
        ],
        [
            datalayer_to_search_result(x)
            for x in DataLayer.objects.filter(
                **category_filter,
            )
        ],
        [
            datalayer_to_search_result(x)
            for x in DataLayer.objects.filter(
                **datalayer_filter,
            )
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


def get_datalayer_by_module_atribute(
    module: str,
    attribute: str,
    value: Any,
) -> DataLayer:
    return DataLayer.objects.get(
        metadata__has_key="modules",
        metadata__contains={"modules": {module: {attribute: value}}},
        status=DataLayerStatus.READY,
    )


def get_table_mask(datalayer: DataLayer) -> Optional[GEOSGeometry]:
    """
    Given a datalayer, returns the UNION of all geometries bounding boxes.
    """
    srid = 4269  # hardcoded as we only import stuff in 4269
    schema, table = datalayer.table.split(".")
    with connection.cursor() as cursor:
        query = f"""SELECT
ST_AsText(
    ST_UnaryUnion(
        ST_Collect(
            ST_Envelope(geometry)
        )
    )
) as geometry
FROM "{schema}"."{table}"
WHERE geometry IS NOT NULL;
"""
        cursor.execute(query)
        row = cursor.fetchone()
        if row:
            return GEOSGeometry(row[0], srid=srid)

        return None


def get_datalayer_outline(datalayer: DataLayer) -> Optional[GEOSGeometry]:
    match datalayer.type:
        case DataLayerType.RASTER:
            if not datalayer.url:
                raise ValueError("datalayer url is none")
            return geodjango_to_multi(
                to_geodjango_geometry(get_estimated_mask_raster(datalayer.url))
            )
        case _:
            if not datalayer.table:
                raise ValueError("datalayer table is none")
            return get_table_mask(datalayer)


def enable_datalayer_module(datalayer: DataLayer, module: str) -> DataLayer:
    from modules.base import MODULE_HANDLERS

    if module not in MODULE_HANDLERS:
        raise ValueError(f"Unknown module: {module}")

    metadata = datalayer.metadata if isinstance(datalayer.metadata, dict) else {}
    metadata = metadata.copy()
    modules = metadata.get("modules")
    if not isinstance(modules, dict):
        modules = {}
    module_metadata = modules.get(module)
    if not isinstance(module_metadata, dict):
        module_metadata = {}

    module_metadata = {**module_metadata, "enabled": True}
    modules = {**modules, module: module_metadata}
    metadata["modules"] = modules
    datalayer.metadata = metadata
    datalayer.save(update_fields=["metadata", "updated_at"])
    return datalayer
