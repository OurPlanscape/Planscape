from typing import Optional
import magic
from mimetypes import guess_extension


def detect_mimetype(input_file: str) -> Optional[str]:
    try:
        mime = magic.Magic(mime=True)
        return mime.from_file(input_file)
    except Exception:
        return None


def extension_from_mimetype(mimetype: str) -> Optional[str]:
    try:
        return guess_extension(mimetype)
    except Exception:
        return None
