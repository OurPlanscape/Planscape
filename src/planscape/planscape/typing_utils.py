from typing import Any, Dict, Type, Union
from django.contrib.auth.models import AbstractUser
from django.contrib.gis.geos import GEOSGeometry

TUser = Type[AbstractUser]
TLooseGeom = Union[Dict[str, Any], GEOSGeometry, None]
