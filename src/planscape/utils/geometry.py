from django.contrib.gis.geos import GEOSGeometry
from django.conf import settings


def to_multi(geometry):
    if geometry["type"].startswith("Multi"):
        return geometry

    new_coordinates = [geometry.get("coordinates")]
    new_type = f'Multi{geometry["type"]}'
    return {
        "type": new_type,
        "coordinates": new_coordinates,
    }


def get_acreage(geometry: GEOSGeometry) -> float:
    epsg_5070_area = geometry.transform(settings.AREA_SRID, clone=True).area
    acres = epsg_5070_area / settings.CONVERSION_SQM_ACRES
    return acres
