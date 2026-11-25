import itertools
import json
import logging
import mimetypes
from copy import deepcopy
from datetime import timedelta
from pathlib import Path
from typing import Any, Collection, Dict, Optional, Set, Tuple, Union
from uuid import uuid4

import mmh3
from actstream import action
from cacheops import cached, invalidate_model
from core.flags import feature_enabled
from core.gcs import create_upload_url as create_upload_url_gcs
from core.gcs import delete_file as delete_gcs_file
from core.gcs import is_gcs_file
from core.s3 import create_upload_url as create_upload_url_s3
from core.s3 import is_s3_file, s3_filename
from datasets.events import (
    DATALAYER_CREATED,
    DATALAYER_DELETED,
    DATALAYER_STATUS_CHANGED,
    DATALAYER_UPDATED,
    publish_datalayer_favorited,
    publish_datalayer_unfavorited,
    publish_upload_event,
)
from datasets.models import (
    Category,
    DataLayer,
    DataLayerHasStyle,
    DataLayerOrigin,
    DataLayerStatus,
    DataLayerType,
    Dataset,
    GeometryType,
    MapServiceChoices,
    PreferredDisplayType,
    SearchGroupBy,
    SearchResult,
    SearchTab,
    SimpleCategory,
    StorageTypeChoices,
    Style,
    VisibilityOptions,
    WorkspaceFavoriteDataLayer,
)
from datasets.search import (
    datalayer_to_search_result,
    dataset_to_search_result,
    simple_category_to_search_result,
)
from datasets.tasks import datalayer_uploaded
from datasets.upload_metadata import write_upload_metadata
from datasets.styles import DEFAULT_NO_DATA, get_upload_style
from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.gis.geos import GEOSGeometry, Polygon
from django.db import connection, transaction
from django.db.models import BooleanField, QuerySet
from django.utils import timezone
from django.db.models.expressions import RawSQL
from gis.geometry import geodjango_to_multi, to_geodjango_geometry
from gis.rasters import get_estimated_mask as get_estimated_mask_raster
from modules.base import filter_datalayers
from organizations.models import Organization
from planning.models import TreatmentGoalUsageType
from rest_framework.exceptions import NotFound
from workspaces.models import Workspace

from planscape.analytics import track_event

log = logging.getLogger(__name__)


def get_bucket_url() -> str:
    """Returns the bucket URL based on the current provider."""
    if settings.PROVIDER == "gcp":
        return f"gs://{settings.GCS_BUCKET}"
    return f"s3://{settings.S3_BUCKET}"


def owner_properties(
    organization: Optional[Organization], workspace: Optional[Workspace] = None
) -> Dict[str, Any]:
    """Analytics properties for whoever owns a datalayer or style."""
    if organization:
        return {
            "organization_id": organization.pk,
            "organization_name": organization.name,
        }
    return {"workspace_id": workspace.pk if workspace else None}


def get_object_name(
    organization_id: Union[int, str],
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
    organization_id: Union[int, str],
    uuid: str,
    original_name: str,
    mimetype: Optional[str] = None,
) -> str:
    if is_s3_file(original_name) or is_gcs_file(original_name):
        return original_name
    return f"{get_bucket_url()}/{get_object_name(organization_id, uuid, original_name, mimetype)}"


def get_storage_path(
    organization_id: int,
    uuid: str,
    original_name: str,
    mimetype: Optional[str] = None,
) -> str:
    if settings.MOUNTED_DATASTORE_BUCKET_ROOT is None:
        raise ValueError("Datastore Bucket not mounted.")

    return f"{settings.MOUNTED_DATASTORE_BUCKET_ROOT}/{get_object_name(organization_id, uuid, original_name, mimetype)}"


def get_storage_url_and_path(
    organization_id: int,
    uuid: str,
    original_name: str,
    mimetype: Optional[str] = None,
) -> Tuple[str, Optional[str]]:
    storage_url = get_storage_url(
        organization_id=organization_id,
        uuid=uuid,
        original_name=original_name,
        mimetype=mimetype,
    )
    storage_path = None
    if settings.MOUNTED_DATASTORE_BUCKET_ROOT:
        storage_path = get_storage_path(
            organization_id=organization_id,
            uuid=uuid,
            original_name=original_name,
            mimetype=mimetype,
        )

    return storage_url, storage_path


def create_upload_url_for_org(
    organization_id: Union[int, str],
    uuid: str,
    original_name: str,
    mimetype: Optional[str] = None,
    upload_session: Optional[Dict[str, Any]] = None,
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
                **(upload_session or {}),
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
    organization: Optional[Organization],
    workspace: Workspace,
    created_by: User,
    description: Optional[str] = None,
    visibility: VisibilityOptions = VisibilityOptions.PUBLIC,
    version: Optional[str] = None,
    selection_type: Optional[str] = None,
    preferred_display_type: Optional[str] = None,
    **kwargs,
) -> Dataset:
    dataset = Dataset.objects.create(
        name=name,
        organization=organization,
        workspace=workspace,
        created_by=created_by,
        description=description,
        visibility=visibility,
        version=version,
        selection_type=selection_type,
        preferred_display_type=preferred_display_type,
    )
    invalidate_model(Dataset)
    track_event(
        name="datasets.dataset.created",
        properties={
            **owner_properties(organization, workspace),
            "visibility": visibility,
            "email": created_by.email if created_by else None,
        },
        user_id=created_by.pk,
    )
    return dataset


def style_hash(data: Dict[str, Any]) -> str:
    return mmh3.hash_bytes(json.dumps(data)).hex()


@transaction.atomic()
def create_style(
    name: str,
    organization: Optional[Organization],
    created_by: User,
    type: DataLayerType,
    data: Dict[str, Any],
    datalayers: Optional[Collection[DataLayer]] = None,
    **kwargs,
) -> Dict[str, Any]:
    """Pass `workspace` in kwargs for a style owned by a workspace."""
    data_hash = style_hash(data)
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
        **kwargs,
    )
    action.send(created_by, verb="created", action_object=style)
    track_event(
        name="datasets.style.created",
        properties={
            **owner_properties(organization, kwargs.get("workspace")),
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
    track_event(
        name="datasets.style.assigned",
        properties={
            **owner_properties(style.organization, style.workspace),
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
    DataLayerStatus.PROCESSING: [DataLayerStatus.FAILED, DataLayerStatus.READY],
    DataLayerStatus.READY: [DataLayerStatus.READY],
    DataLayerStatus.FAILED: [DataLayerStatus.PENDING, DataLayerStatus.READY],
}


@transaction.atomic()
def change_datalayer_status(
    organization: Optional[Organization],
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
    track_event(
        name="datasets.datalayer.changed_status",
        properties={
            **owner_properties(
                organization or datalayer.organization, datalayer.workspace
            ),
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
    organization: Optional[Organization],
    created_by: User,
    original_name: Optional[str] = None,
    url: Optional[str] = None,
    storage_type: Optional[str] = None,
    category: Optional[Category] = None,
    type: Optional[DataLayerType] = None,
    geometry_type: Optional[GeometryType] = None,
    info: Optional[Dict[str, Any]] = None,
    mimetype: Optional[str] = None,
    upload_session: Optional[Dict[str, Any]] = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Creates a datalayer owned by an organization, or by the `workspace` in
    kwargs when there is none. `upload_session` goes to the GCS upload session.
    """
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

    workspace = kwargs.get("workspace")
    owner = organization.pk if organization else f"workspaces/{workspace.pk}"

    if original_name:
        storage_url = get_storage_url(
            organization_id=owner,
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
            organization_id=owner,
            uuid=uuid,
            original_name=original_name,
            mimetype=mimetype,
            upload_session=upload_session,
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
    track_event(
        name="datasets.datalayer.created",
        properties={
            **owner_properties(organization, workspace),
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
    search_tab: str = SearchTab.GENERAL,
    user: Optional[User] = None,
    workspace: Optional[Workspace] = None,
) -> QuerySet[DataLayer]:
    datalayers = filter_datalayers(
        DataLayer.objects.filter(dataset=dataset),
        type=type,
        module=module,
        geometry=geometry,
        search_tab=search_tab,
        user=user,
        workspace=workspace,
    )
    return datalayers.select_related(
        "organization",
        "dataset",
        "category",
    ).prefetch_related("styles", "simple_categories")


def browse_simple_category(
    category: SimpleCategory,
    type: Optional[DataLayerType] = None,
    module: Optional[str] = None,
    geometry: Optional[GEOSGeometry] = None,
    search_tab: str = SearchTab.GENERAL,
    user: Optional[User] = None,
    workspace: Optional[Workspace] = None,
) -> QuerySet[DataLayer]:
    datalayers = filter_datalayers(
        DataLayer.objects.filter(simple_categories=category),
        type=type,
        module=module,
        geometry=geometry,
        search_tab=search_tab,
        user=user,
        workspace=workspace,
    )
    return (
        datalayers.select_related(
            "organization",
            "dataset",
            "category",
        )
        .prefetch_related("styles", "simple_categories")
        .distinct()
    )


def browse_datalayers(
    search_tab: str,
    workspace: Optional[Workspace] = None,
    type: Optional[DataLayerType] = None,
    module: Optional[str] = None,
    geometry: Optional[GEOSGeometry] = None,
    user: Optional[User] = None,
) -> QuerySet[DataLayer]:
    """
    The datalayers of a search tab (the workspace's favorites, or uploads),
    across all datasets.
    """
    datalayers = filter_datalayers(
        DataLayer.objects.all(),
        type=type,
        module=module,
        geometry=geometry,
        search_tab=search_tab,
        user=user,
        workspace=workspace,
    )
    return (
        datalayers.select_related(
            "organization",
            "dataset",
            "category",
        )
        .prefetch_related("styles", "simple_categories")
        .order_by("name")
    )


def _escape_like(term: str) -> str:
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


EXCLUDED_METADATA_KEYS = ("keywords_type", "language")


def metadata_values_contain(term: str) -> RawSQL:
    """
    Matches datalayers whose `metadata.metadata.identification` has any string
    value containing `term` (case insensitive), at any depth. Only values are
    searched, never keys, and values under the keys in
    `EXCLUDED_METADATA_KEYS` are ignored.
    """
    column = f'"{DataLayer._meta.db_table}"."metadata"'
    excluded = ", ".join(["%s"] * len(EXCLUDED_METADATA_KEYS))
    sql = f"""EXISTS (
    WITH RECURSIVE node(key, value) AS (
        SELECT NULL::text, {column} #> '{{metadata,identification}}'
        UNION ALL
        SELECT child.key, child.value
        FROM node
        CROSS JOIN LATERAL (
            SELECT e.key, e.value
            FROM jsonb_each(
                CASE WHEN jsonb_typeof(node.value) = 'object'
                    THEN node.value ELSE '{{}}'::jsonb END
            ) AS e
            UNION ALL
            SELECT NULL::text, a.value
            FROM jsonb_array_elements(
                CASE WHEN jsonb_typeof(node.value) = 'array'
                    THEN node.value ELSE '[]'::jsonb END
            ) AS a
        ) AS child
        WHERE child.key IS NULL OR child.key NOT IN ({excluded})
    )
    SELECT 1 FROM node
    WHERE jsonb_typeof(node.value) = 'string'
    AND node.value #>> '{{}}' ILIKE %s
)"""
    return RawSQL(
        sql,
        (*EXCLUDED_METADATA_KEYS, f"%{_escape_like(term)}%"),
        output_field=BooleanField(),
    )


@cached(timeout=settings.FIND_ANYTHING_TTL)
def find_anything(
    term: str,
    type: DataLayerType,
    module: Optional[str] = None,
    geometry: Optional[GEOSGeometry] = None,
    search_tab: str = SearchTab.GENERAL,
    user: Optional[User] = None,
    workspace: Optional[Workspace] = None,
    group_by: Optional[str] = None,
    **kwargs,
) -> Dict[str, SearchResult]:
    """
    Given a term, search for anything (datasets / datalayers).

    `group_by` picks what datalayers are browsed through: simple categories
    or datasets. Without it, the DATA_ORGANIZATION flag decides.
    """
    if group_by is None:
        group_by = (
            SearchGroupBy.SIMPLE_CATEGORY
            if feature_enabled("DATA_ORGANIZATION")
            else SearchGroupBy.DATASET
        )
    datalayers = filter_datalayers(
        DataLayer.objects.all(),
        type=type or DataLayerType.RASTER,
        module=module,
        geometry=geometry,
        search_tab=search_tab,
        user=user,
        workspace=workspace,
    )
    # datasets and organizations are only returned when they hold at least one
    # of those datalayers, so browsing them is never empty
    datasets = Dataset.objects.filter(pk__in=datalayers.values("dataset_id"))

    simple_categories = SimpleCategory.objects.none()
    simple_category_datalayers = DataLayer.objects.none()
    if group_by == SearchGroupBy.SIMPLE_CATEGORY:
        # simple categories replace datasets as the way to browse datalayers
        datasets = Dataset.objects.none()
        simple_categories = SimpleCategory.objects.filter(
            name__icontains=term,
            id__in=datalayers.values("simple_categories"),
        )
        simple_category_datalayers = datalayers.filter(
            simple_categories__name__icontains=term
        ).distinct()

    raw_results = [
        [
            dataset_to_search_result(x)
            for x in datasets.filter(organization__name__icontains=term)
        ],
        [dataset_to_search_result(x) for x in datasets.filter(name__icontains=term)],
        [simple_category_to_search_result(x) for x in simple_categories],
        [
            datalayer_to_search_result(x)
            for x in datalayers.filter(category__name__icontains=term)
        ],
        [
            datalayer_to_search_result(x)
            for x in datalayers.filter(name__icontains=term)
        ],
        [datalayer_to_search_result(x) for x in simple_category_datalayers],
        [
            datalayer_to_search_result(x)
            for x in datalayers.alias(
                metadata_match=metadata_values_contain(term)
            ).filter(metadata_match=True)
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

    # a category is redundant when its layers are already in the results
    layer_category_ids = {
        category["id"]
        for result in results.values()
        if result.type == "DATALAYER"
        for category in result.data.get("simple_categories", [])
    }
    return {
        key: result
        for key, result in results.items()
        if not (result.type == "SIMPLE_CATEGORY" and result.id in layer_category_ids)
    }


def add_favorite_datalayer(
    user: User,
    workspace: Workspace,
    datalayer: DataLayer,
) -> Tuple[WorkspaceFavoriteDataLayer, bool]:
    """
    Favorites the datalayer in the workspace. Favoriting an already favorited
    datalayer is a no-op. Returns the favorite and whether it was created.
    """
    favorite, created = WorkspaceFavoriteDataLayer.objects.get_or_create(
        workspace=workspace,
        datalayer=datalayer,
        defaults={"created_by": user},
    )
    if created:
        publish_datalayer_favorited(workspace, datalayer, actor=user)
        track_event(
            name="datasets.datalayer.favorited",
            properties={
                "workspace_id": workspace.pk,
                "datalayer_id": datalayer.pk,
                "email": user.email,
            },
            user_id=user.pk,
        )
    return favorite, created


def get_favorite_datalayer_ids(
    workspace: Optional[Workspace],
    datalayer_ids: Collection[int],
) -> Optional[Set[int]]:
    """
    Returns which of `datalayer_ids` are favorites of the workspace, or None
    when there is no workspace to check against.
    """
    if workspace is None:
        return None
    return set(
        WorkspaceFavoriteDataLayer.objects.filter(
            workspace=workspace,
            datalayer_id__in=datalayer_ids,
        ).values_list("datalayer_id", flat=True)
    )


def remove_favorite_datalayer(
    user: User,
    workspace: Workspace,
    datalayer_id: int,
) -> None:
    deleted, _ = WorkspaceFavoriteDataLayer.objects.filter(
        workspace=workspace,
        datalayer_id=datalayer_id,
    ).delete()
    if not deleted:
        raise NotFound("DataLayer is not a favorite of this workspace.")

    publish_datalayer_unfavorited(workspace, datalayer_id, actor=user)
    track_event(
        name="datasets.datalayer.unfavorited",
        properties={
            "workspace_id": workspace.pk,
            "datalayer_id": datalayer_id,
            "email": user.email,
        },
        user_id=user.pk,
    )


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
    Given a datalayer, returns a polygonal mask for all table geometries.
    """
    geometry_type = datalayer.geometry_type
    if geometry_type in {None, GeometryType.NO_GEOM}:
        return None

    srid = 4269  # hardcoded as we only import stuff in 4269
    schema, table = datalayer.table.split(".")
    with connection.cursor() as cursor:
        if geometry_type in {GeometryType.POLYGON, GeometryType.MULTIPOLYGON}:
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
        else:
            # ConvexHull can return POINT or LINESTRING for sparse point/line layers;
            # only area masks are valid here, and ST_Multi normalizes POLYGON output.
            query = f"""SELECT
    ST_AsText(
        CASE
            WHEN GeometryType(mask) IN ('POLYGON', 'MULTIPOLYGON')
                THEN ST_Multi(mask)
            ELSE NULL
        END
    ) as geometry
FROM (
    SELECT
        ST_ConvexHull(ST_Collect(geometry)) AS mask
    FROM "{schema}"."{table}"
    WHERE geometry IS NOT NULL
) masks;
"""
        cursor.execute(query)
        row = cursor.fetchone()
        if row and row[0]:
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


def enable_datalayer_module(
    datalayer: DataLayer,
    module: str,
    module_options: Optional[Dict[str, Any]],
) -> DataLayer:
    from modules.base import MODULE_HANDLERS

    if module not in MODULE_HANDLERS:
        raise ValueError(f"Unknown module: {module}")

    if (
        module == "forsys"
        and not module_options
        and datalayer.type == DataLayerType.RASTER
    ):
        module_options = {
            "capabilities": [
                TreatmentGoalUsageType.PRIORITY,
                TreatmentGoalUsageType.SECONDARY_METRIC,
                TreatmentGoalUsageType.THRESHOLD,
            ]
        }

    metadata = datalayer.metadata if isinstance(datalayer.metadata, dict) else {}
    metadata = metadata.copy()
    modules = metadata.get("modules")
    if not isinstance(modules, dict):
        modules = {}
    module_metadata = modules.get(module)
    if not isinstance(module_metadata, dict):
        module_metadata = {}
    if not module_options:
        module_metadata = {
            **module_metadata,
            "enabled": True,
        }
    else:
        module_metadata = {
            **module_metadata,
            **module_options,
            "enabled": True,
        }

    modules = {**modules, module: module_metadata}
    metadata["modules"] = modules
    datalayer.metadata = metadata
    datalayer.save(update_fields=["metadata", "updated_at"])
    return datalayer


UPLOAD_MIMETYPE = "image/tiff"


class UploadsNotSupported(Exception):
    pass


def workspace_uploads_prefix() -> str:
    """Where workspace uploads live; GCS finalize notifications watch it."""
    return f"gs://{settings.GCS_BUCKET}/{settings.DATALAYERS_FOLDER}/workspaces/"


def upload_dataset_name(user: User) -> str:
    return f"{user.get_full_name() or user.email} uploaded data"


def get_or_create_workspace_upload_dataset(
    workspace: Workspace,
    user: User,
) -> Dataset:
    """
    The dataset that holds a user's uploads to a workspace, one per uploader.
    Locks the workspace row so two first uploads can't create two datasets.
    """
    Workspace.objects.select_for_update().filter(pk=workspace.pk).first()
    dataset = (
        Dataset.objects.filter(workspace=workspace, created_by=user)
        .order_by("pk")
        .first()
    )
    if dataset:
        return dataset
    return create_dataset(
        name=upload_dataset_name(user),
        organization=None,
        workspace=workspace,
        created_by=user,
        visibility=VisibilityOptions.PRIVATE,
        preferred_display_type=PreferredDisplayType.MAIN_DATALAYERS,
    )


_UNCHANGED = object()


@transaction.atomic
def update_workspace_datalayer(
    datalayer: DataLayer, user: User, **fields: Any
) -> DataLayer:
    """
    Renames an upload, edits its metadata (see `upload_metadata`) and/or sets
    its style (`style=None` goes back to the automatic ramp).
    """
    name = fields.pop("name", None)
    style = fields.pop("style", _UNCHANGED)
    if name is not None:
        datalayer.name = name
    if fields:
        datalayer.metadata = write_upload_metadata(datalayer.metadata, fields)
    datalayer.save(update_fields=["name", "metadata", "updated_at"])
    if style is not _UNCHANGED:
        set_upload_style(datalayer, user, style)
    invalidate_model(DataLayer)
    publish_upload_event(DATALAYER_UPDATED, datalayer, actor=user)
    return datalayer


def set_upload_style(
    datalayer: DataLayer, user: User, style_data: Optional[Dict[str, Any]]
) -> Optional[Style]:
    """Gives an upload its own style, or removes it when `style_data` is None."""
    style = get_upload_style(datalayer)
    if style_data is None:
        if style:
            # styles are soft-deleted, so the link has to go explicitly
            DataLayerHasStyle.objects.filter(datalayer=datalayer, style=style).delete()
            style.delete()
            invalidate_model(Style)
        return None

    data = {
        "map_type": style_data["map_type"],
        "no_data": deepcopy(DEFAULT_NO_DATA),
        "entries": [
            {
                "value": entry["value"],
                "color": entry["color"],
                "opacity": 1,
                "label": entry.get("label") or f"{entry['value']:g}",
            }
            for entry in style_data["entries"]
        ],
    }
    if not style:
        return create_style(
            name=f"upload-{datalayer.uuid}",
            organization=None,
            workspace=datalayer.workspace,
            created_by=user,
            type=DataLayerType.RASTER,
            data=data,
            datalayers=[datalayer],
        )["style"]

    style.data = data
    style.data_hash = style_hash(data)
    style.save(update_fields=["data", "data_hash", "updated_at"])
    invalidate_model(Style)
    return style


@transaction.atomic()
def create_workspace_upload(
    workspace: Workspace,
    created_by: User,
    name: str,
    original_name: str,
    size: int,
    origin: Optional[str] = None,
) -> Dict[str, Any]:
    """A PENDING raster upload, plus the GCS session the browser PUTs it to."""
    if settings.PROVIDER != "gcp":
        raise UploadsNotSupported("Uploads are only supported on GCS storage.")

    result = create_datalayer(
        name=name,
        dataset=get_or_create_workspace_upload_dataset(workspace, created_by),
        organization=None,
        workspace=workspace,
        created_by=created_by,
        original_name=original_name,
        mimetype=UPLOAD_MIMETYPE,
        type=DataLayerType.RASTER,
        geometry_type=GeometryType.RASTER,
        map_service_type=MapServiceChoices.COG,
        status=DataLayerStatus.PENDING,
        file_size=size,
        origin=DataLayerOrigin.USER,
        # module lists only include layers enabled for them
        metadata={"modules": {"map": {"enabled": True}}},
        upload_session={
            "content_type": UPLOAD_MIMETYPE,
            "size": size,
            "origin": origin,
        },
    )
    publish_upload_event(DATALAYER_CREATED, result["datalayer"], actor=created_by)
    return result


def delete_upload_file(datalayer: DataLayer) -> None:
    try:
        delete_gcs_file(datalayer.url)
    except Exception:
        log.exception("Could not delete the file of datalayer %s", datalayer.pk)


@transaction.atomic()
def delete_workspace_datalayer(datalayer: DataLayer, user: User) -> None:
    # READY layers keep their file like any soft-deleted datalayer
    if datalayer.status != DataLayerStatus.READY:
        transaction.on_commit(lambda: delete_upload_file(datalayer))
    datalayer.delete()
    action.send(user, verb="deleted", action_object=datalayer)
    invalidate_model(DataLayer)
    publish_upload_event(DATALAYER_DELETED, datalayer, actor=user)


def publish_upload_status(datalayer: DataLayer) -> None:
    """Tells the workspace the status an upload is in now."""
    invalidate_model(DataLayer)
    publish_upload_event(DATALAYER_STATUS_CHANGED, datalayer)


def set_upload_status(
    datalayer: DataLayer,
    status: DataLayerStatus,
    failure_reason: Optional[str] = None,
) -> None:
    datalayer.status = status
    datalayer.failure_reason = failure_reason
    datalayer.save(update_fields=["status", "failure_reason", "updated_at"])
    publish_upload_status(datalayer)


def expire_stale_uploads() -> int:
    """
    Fails uploads whose file never arrived and uploads stuck processing.
    Returns how many were expired.
    """
    now = timezone.now()
    pending_cutoff = now - timedelta(hours=settings.DATALAYER_UPLOAD_PENDING_TTL_HOURS)
    processing_cutoff = now - timedelta(
        hours=settings.DATALAYER_UPLOAD_PROCESSING_TTL_HOURS
    )
    uploads = DataLayer.objects.filter(origin=DataLayerOrigin.USER)
    stale = (
        (
            uploads.filter(
                status=DataLayerStatus.PENDING, created_at__lt=pending_cutoff
            ),
            "The upload never completed.",
        ),
        (
            uploads.filter(
                status=DataLayerStatus.PROCESSING, updated_at__lt=processing_cutoff
            ),
            "Processing timed out.",
        ),
    )

    expired = 0
    for datalayers, reason in stale:
        for datalayer in datalayers:
            set_upload_status(datalayer, DataLayerStatus.FAILED, reason)
            expired += 1
    return expired
