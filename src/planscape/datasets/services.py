from uuid import uuid4
from django.db import transaction
from django.conf import settings
from typing import Any, Dict, Optional
from actstream import action
from core.s3 import create_upload_url
from datasets.models import DataLayer, Category, Dataset


def get_object_name(organization_id: int, uuid: str) -> str:
    return f"{settings.DATALAYERS_FOLDER}/{organization_id}/{uuid}"


def get_storage_url(organization_id: int, uuid: str) -> str:
    return f"s3://{settings.S3_BUCKET}/{get_object_name(organization_id, uuid)}"


def create_upload_url_for_org(organization_id: int, uuid: str) -> str:
    object_name = get_object_name(organization_id, uuid)
    upload_url_response = create_upload_url(
        bucket_name=settings.S3_BUCKET,
        object_name=object_name,
        expiration=settings.UPLOAD_EXPIRATION_TTL,
    )
    if not upload_url_response:
        raise ValueError("Could not create upload url.")

    return upload_url_response["url"]


@transaction.atomic()
def create_datalayer(
    name: str,
    dataset: Dataset,
    organization,
    created_by,
    category: Optional[Category] = None,
    **kwargs,
) -> Dict[str, Any]:
    metadata = kwargs.get("metadata", None) or None
    uuid = str(uuid4())
    storage_url = get_storage_url(organization_id=organization.pk, uuid=uuid)
    datalayer = DataLayer.objects.create(
        name=name,
        uuid=uuid,
        dataset=dataset,
        created_by=created_by,
        organization=organization,
        category=category,
        url=storage_url,
        metadata=metadata,
    )
    upload_to = create_upload_url_for_org(
        organization_id=organization.pk,
        uuid=uuid,
    )
    action.send(created_by, verb="created", action_object=datalayer)
    return {
        "datalayer": datalayer,
        "upload_to": upload_to,
    }
