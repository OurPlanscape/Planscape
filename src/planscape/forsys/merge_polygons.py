from django.contrib.gis.geos import MultiPolygon, Polygon


# Merges input polygons and outputs either ...
#   - a single merged Polygon (if the polygons are contiguous)
#   - a MultiPolygon containing merged polygons (if the polygons aren't
#     contiguous)
# Input parameter, simplify_margin, controls the extent to which merged
# polygons are simplified (according to the Douglas-Peucker algorithm, which,
# for line segments joining points A => B => C, removes point B if the distance
# between B and line segment, A => C, is below a given margin) --
#   - simplify_margin=None means no simplification occurs
#   - simplify_margin=0 means extraneous points within a straight line are
#     removed while preserving the fidelity of the merged polygon
#     (e.g. (0,0) => (0,1) => (0,3) is simplified to (0,0) -> (0,3) because the
#     distance beetween (0,1) and the line joining (0,0) to (0,3) is 0)
#   - simplify_margin>0 will remove points without preserving the fidelity of
#     the merged polygon
# Input parameter expectations:
#   - Polygons in input parameter, polygons, must have the same SRID
#   - input parameter, simplify_margin, must be None or gte 0
def merge_polygons(
    polygons: list[Polygon], simplify_margin: float | None
) -> Polygon | MultiPolygon | None:
    if simplify_margin is not None and simplify_margin < 0:
        raise Exception("parameter, simpify_margin, must be gte 0")

    if len(polygons) == 0:
        return None

    geo = polygons[0]
    for i in range(1, len(polygons)):
        p = polygons[i]
        if p.srid != geo.srid:
            raise Exception("merge_polygon input polygons have different SRID's")
        geo = geo.union(p)

    if simplify_margin is None:
        return geo

    return geo.simplify(simplify_margin, True)
