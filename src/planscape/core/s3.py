import logging
from typing import Any, Dict, List, Optional

import boto3
import requests
from botocore.exceptions import ClientError


def create_download_url(
    bucket_name: str,
    object_name: str,
    expiration: int = 3600,
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
