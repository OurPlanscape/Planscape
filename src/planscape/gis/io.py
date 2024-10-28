from typing import Optional
import magic
from mimetypes import guess_extension


def detect_mimetype(input_file: str) -> Optional[str]:
    mime = magic.Magic(mime=True)
    return mime.from_file(input_file)


def extension_from_mimetype(mimetype: str) -> Optional[str]:
    guess_extension(mimetype)
