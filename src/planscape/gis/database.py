from django.contrib.gis.db.models import GeometryField
from django.db.models import Func


class SimplifyPreserveTopology(Func):
    """
    Wraps PostGIS ST_SimplifyPreserveTopology(geom, tolerance).
    Tolerance is in the SRID units of `geom`.
    """

    function = "ST_SimplifyPreserveTopology"
    arity = 2  # geom, tolerance

    def __init__(self, expression, tolerance, output_field=None, **extra):
        # Try to preserve SRID from the input geom’s output_field if present.
        if output_field is None:
            srid = getattr(getattr(expression, "output_field", None), "srid", None)
            output_field = GeometryField(srid=srid)
        super().__init__(expression, tolerance, output_field=output_field, **extra)
