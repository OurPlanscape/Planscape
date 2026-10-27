import itertools
import json
import logging
import mimetypes
from pathlib import Path
from typing import Any, Collection, Dict, Optional, Set, Tuple
from uuid import uuid4

import mmh3
from actstream import action
from cacheops import cached, invalidate_model
from core.flags import feature_enabled
from core.gcs import create_upload_url as create_upload_url_gcs
from core.gcs import is_gcs_file
from core.s3 import create_upload_url as create_upload_url_s3
from core.s3 import is_s3_file, s3_filename
from datasets.events import publish_datalayer_favorited, publish_datalayer_unfavorited
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
from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.gis.geos import GEOSGeometry, Polygon
from django.db import connection, transaction
from django.db.models import BooleanField, QuerySet
from django.db.models.expressions import RawSQL
from gis.geometry import geodjango_to_multi, to_geodjango_geometry
from gis.rasters import get_estimated_mask as get_estimated_mask_raster
from modules.base import get_module
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
    track_event(
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
    track_event(
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
    track_event(
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
    track_event(
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
    search_tab: str = SearchTab.GENERAL,
    workspace: Optional[Workspace] = None,
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
        .prefetch_related("styles", "simple_categories")
    )

    if type is not None:
        datalayers = datalayers.filter(type=type)

    if geometry is not None:
        datalayers = datalayers.filter(outline__intersects=geometry)

    if module:
        filter = {f"metadata__modules__{module}__enabled": True}
        datalayers = datalayers.filter(**filter)

    if search_tab == SearchTab.FAVORITES:
        datalayers = datalayers.filter(workspace_favorites__workspace=workspace)
    elif search_tab == SearchTab.UPLOADED:
        # TODO: narrow to uploaded datalayers once uploaded filtering is defined.
        pass

    return datalayers


def browse_simple_category(
    category: SimpleCategory,
    type: Optional[DataLayerType] = None,
    module: Optional[str] = None,
    geometry: Optional[GEOSGeometry] = None,
    search_tab: str = SearchTab.GENERAL,
    user: Optional[User] = None,
    workspace: Optional[Workspace] = None,
) -> QuerySet[DataLayer]:
    datalayers = (
        DataLayer.objects.all()
        .accessible_by(user)
        .filter(
            simple_categories=category,
            status=DataLayerStatus.READY,
        )
        .select_related(
            "organization",
            "dataset",
            "category",
        )
        .prefetch_related("styles", "simple_categories")
    )

    if type is not None:
        datalayers = datalayers.filter(type=type)

    if geometry is not None:
        datalayers = datalayers.filter(outline__intersects=geometry)

    if module:
        filter = {f"metadata__modules__{module}__enabled": True}
        datalayers = datalayers.filter(**filter)

    if search_tab == SearchTab.FAVORITES:
        datalayers = datalayers.filter(workspace_favorites__workspace=workspace)
    elif search_tab == SearchTab.UPLOADED:
        # TODO: narrow to uploaded datalayers once uploaded filtering is defined.
        pass

    return datalayers.distinct()


def browse_favorites(
    workspace: Workspace,
    type: Optional[DataLayerType] = None,
    module: Optional[str] = None,
    geometry: Optional[GEOSGeometry] = None,
    user: Optional[User] = None,
) -> QuerySet[DataLayer]:
    """
    Every datalayer favorited in the workspace, across all datasets.
    """
    datalayers = (
        DataLayer.objects.all()
        .accessible_by(user)
        .filter(
            workspace_favorites__workspace=workspace,
            status=DataLayerStatus.READY,
        )
        .select_related(
            "organization",
            "dataset",
            "category",
        )
        .prefetch_related("styles", "simple_categories")
    )

    if type is not None:
        datalayers = datalayers.filter(type=type)

    if geometry is not None:
        datalayers = datalayers.filter(outline__intersects=geometry)

    if module:
        filter = {f"metadata__modules__{module}__enabled": True}
        datalayers = datalayers.filter(**filter)

    return datalayers.order_by("name")


def _escape_like(term: str) -> str:
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def metadata_values_contain(term: str) -> RawSQL:
    """
    Matches datalayers that have any string value in their metadata containing
    `term` (case insensitive). Only values are searched, never keys, and the
    internal `modules` configuration is ignored.
    """
    column = f'"{DataLayer._meta.db_table}"."metadata"'
    sql = f"""EXISTS (
    SELECT 1
    FROM jsonb_path_query(
        CASE
            WHEN jsonb_typeof({column}) = 'object' THEN {column} - 'modules'
            ELSE {column}
        END,
        'strict $.**'
    ) AS value
    WHERE jsonb_typeof(value) = 'string'
    AND value #>> '{{}}' ILIKE %s
)"""
    return RawSQL(sql, (f"%{_escape_like(term)}%",), output_field=BooleanField())


@cached(timeout=settings.FIND_ANYTHING_TTL)
def find_anything(
    term: str,
    type: DataLayerType,
    module: Optional[str] = None,
    geometry: Optional[GEOSGeometry] = None,
    search_tab: str = SearchTab.GENERAL,
    user: Optional[User] = None,
    workspace: Optional[Workspace] = None,
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
            for d in mod.get_datasets(user=user)
            if d.preferred_display_type == preferred_display_type
        ]
    else:
        dataset_ids = None

    datalayer_filter: Dict[str, Any] = {
        "name__icontains": term,
        "status": DataLayerStatus.READY,
        "type": layer_type,
    }
    category_filter: Dict[str, Any] = {
        "category__name__icontains": term,
        "status": DataLayerStatus.READY,
        "type": layer_type,
    }
    # datalayers a simple category must contain to be returned as a result
    simple_category_layer_filter: Dict[str, Any] = {
        "status": DataLayerStatus.READY,
        "type": layer_type,
    }
    simple_category_filter: Dict[str, Any] = {
        "simple_categories__name__icontains": term,
        "status": DataLayerStatus.READY,
        "type": layer_type,
    }
    metadata_filter: Dict[str, Any] = {
        "metadata_match": True,
        "status": DataLayerStatus.READY,
        "type": layer_type,
    }
    dataset_filter: Dict[str, Any] = {
        "name__icontains": term,
    }
    org_filter: Dict[str, Any] = {
        "organization__name__icontains": term,
    }

    if module:
        datalayer_filter[f"metadata__modules__{module}__enabled"] = True
        category_filter[f"metadata__modules__{module}__enabled"] = True
        simple_category_filter[f"metadata__modules__{module}__enabled"] = True
        simple_category_layer_filter[f"metadata__modules__{module}__enabled"] = True
        metadata_filter[f"metadata__modules__{module}__enabled"] = True

    if dataset_ids:
        datalayer_filter["dataset_id__in"] = dataset_ids
        category_filter["dataset__id__in"] = dataset_ids
        simple_category_filter["dataset_id__in"] = dataset_ids
        simple_category_layer_filter["dataset_id__in"] = dataset_ids
        metadata_filter["dataset_id__in"] = dataset_ids
        dataset_filter["id__in"] = dataset_ids
        org_filter["id__in"] = dataset_ids

    if geometry:
        datalayer_filter["outline__intersects"] = geometry
        category_filter["outline__intersects"] = geometry
        simple_category_filter["outline__intersects"] = geometry
        simple_category_layer_filter["outline__intersects"] = geometry
        metadata_filter["outline__intersects"] = geometry

    if search_tab == SearchTab.FAVORITES:
        favorites = WorkspaceFavoriteDataLayer.objects.filter(
            workspace=workspace,
            datalayer__deleted_at=None,
            datalayer__status=DataLayerStatus.READY,
        )
        favorite_datalayer_ids = favorites.values("datalayer_id")
        datalayer_filter["id__in"] = favorite_datalayer_ids
        category_filter["id__in"] = favorite_datalayer_ids
        simple_category_filter["id__in"] = favorite_datalayer_ids
        simple_category_layer_filter["id__in"] = favorite_datalayer_ids
        metadata_filter["id__in"] = favorite_datalayer_ids
        # `pk__in` instead of `id__in` so it's ANDed with the module filter
        # instead of overwriting it.
        favorite_dataset_ids = favorites.values("datalayer__dataset_id")
        dataset_filter["pk__in"] = favorite_dataset_ids
        org_filter["pk__in"] = favorite_dataset_ids
    elif search_tab == SearchTab.UPLOADED:
        # TODO: narrow to uploaded datalayers once uploaded filtering is defined.
        pass

    simple_categories = SimpleCategory.objects.none()
    simple_category_datalayers = DataLayer.objects.none()
    if feature_enabled("DATA_ORGANIZATION"):
        simple_categories = SimpleCategory.objects.filter(
            name__icontains=term,
            id__in=DataLayer.objects.all()
            .accessible_by(user)
            .filter(**simple_category_layer_filter)
            .values("simple_categories"),
        )
        simple_category_datalayers = (
            DataLayer.objects.all()
            .accessible_by(user)
            .filter(**simple_category_filter)
            .distinct()
        )

    raw_results = [
        [
            dataset_to_search_result(x)
            for x in Dataset.objects.all()
            .accessible_by(user)
            .filter(
                **org_filter,
            )
        ],
        [
            dataset_to_search_result(x)
            for x in Dataset.objects.all()
            .accessible_by(user)
            .filter(
                **dataset_filter,
            )
        ],
        [simple_category_to_search_result(x) for x in simple_categories],
        [
            datalayer_to_search_result(x)
            for x in DataLayer.objects.all()
            .accessible_by(user)
            .filter(
                **category_filter,
            )
        ],
        [
            datalayer_to_search_result(x)
            for x in DataLayer.objects.all()
            .accessible_by(user)
            .filter(
                **datalayer_filter,
            )
        ],
        [datalayer_to_search_result(x) for x in simple_category_datalayers],
        [
            datalayer_to_search_result(x)
            for x in DataLayer.objects.all()
            .accessible_by(user)
            .alias(metadata_match=metadata_values_contain(term))
            .filter(
                **metadata_filter,
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
