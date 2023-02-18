from django.contrib.gis.geos import MultiPolygon, Polygon


def merge_polygons(
        polygons: list[Polygon],
        simplify_margin: float | None) -> Polygon | MultiPolygon | None:
    if len(polygons) == 0:
        return None

    geo = polygons[0]
    for i in range(1, len(polygons)):
        p = polygons[i]
        if p.srid != geo.srid:
            raise Exception(
                "merge_polygon input polygons have different SRID's")
        geo = geo.union(polygons[i])

    if simplify_margin is None:
        return geo

    return geo.simplify(simplify_margin, True)
