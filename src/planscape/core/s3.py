import logging
from typing import Any, Dict, List, Optional

import boto3
import boto3.s3
import requests
from boto3.session import Session
from botocore.exceptions import ClientError
from django.conf import settings


def get_aws_session() -> Session:
    return Session(
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_DEFAULT_REGION,
    )


def create_download_url(
    bucket_name: str,
    object_name: str,
    expiration: int = settings.S3_PUBLIC_URL_TTL,
) -> Optional[str]:
    s3_client = boto3.client("s3")
    try:
        response = s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket_name, "Key": object_name},
            ExpiresIn=expiration,
        )
    except ClientError as e:
        logging.error(e)
        return None

    return response


def create_upload_url(
    bucket_name: str,
    object_name: str,
    expiration: int = 3600,
    fields: Optional[Dict[str, Any]] = None,
    conditions: Optional[List[Any]] = None,
) -> Optional[Dict[str, Any]]:
    s3_client = boto3.client("s3")
    try:
        response = s3_client.generate_presigned_post(
            bucket_name,
            object_name,
            Fields=fields,
            Conditions=conditions,
            ExpiresIn=expiration,
        )
    except ClientError as e:
        logging.error(e)
        return None

    # The response contains the presigned URL and required fields
    return response


def upload_file(
    object_name: str, input_file: str, upload_to: Dict[str, Any]
) -> requests.Response:
    with open(input_file, "rb") as f:
        files = {"file": (object_name, f)}
        response = requests.post(
            upload_to["url"],
            data=upload_to["fields"],
            files=files,
        )
        return response


def is_s3_file(input_file: Optional[str]) -> bool:
    if not input_file:
        return False
    return input_file.lower().startswith("s3://")


def s3_filename(input_file: Optional[str]) -> Optional[str]:
    if not input_file:
        return None
    path, filename = input_file.rsplit("/", 1)
    return filename


def list_files(
    bucket: str,
    prefix: Optional[str],
    extension: Optional[str] = None,
) -> List[str]:
    files = []
    s3 = boto3.resource("s3")
    s3_bucket = s3.Bucket(bucket)
    for object_summary in s3_bucket.objects.filter(Prefix=prefix):
        files.append(object_summary.key)

    if extension:
        return list(filter(lambda x: x.lower().endswith(extension), files))
    return files
