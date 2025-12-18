from django.contrib.gis.geos import MultiLineString, MultiPoint, MultiPolygon
from django.core.exceptions import ObjectDoesNotExist
from django.utils.encoding import smart_str
from django.utils.translation import gettext_lazy as _
from rest_framework.relations import RelatedField
from rest_framework_gis.fields import GeometryField


class UUIDRelatedField(RelatedField):
    """
    A read-write field that represents the target of the relationship
    by a unique 'slug' attribute.
    """

    valid_formats = ("hex_verbose", "hex", "int", "urn")
    default_error_messages = {
        "does_not_exist": _("Object with {uuid_field}={value} does not exist."),
        "invalid": _("Invalid value."),
    }

    def __init__(self, uuid_field="uuid", **kwargs):
        assert uuid_field is not None, "The `uuid_field` argument is required."
        self.uuid_field = uuid_field
        self.uuid_format = kwargs.pop("format", "hex_verbose")
        if self.uuid_format not in self.valid_formats:
            raise ValueError(
                'Invalid format for uuid representation. Must be one of "{}"'.format(
                    '", "'.join(self.valid_formats)
                )
            )
        super().__init__(**kwargs)

    def to_internal_value(self, data):
        try:
            return self.get_queryset().get(**{self.uuid_field: data})
        except ObjectDoesNotExist:
            self.fail(
                "does_not_exist",
                uuid_field=self.uuid_field,
                value=smart_str(data),
            )
        except (TypeError, ValueError):
            self.fail("invalid")

    def to_representation(self, obj):
        value = getattr(obj, self.uuid_field)
        if self.uuid_format == "hex_verbose":
            return str(value)
        else:
            return getattr(value, self.uuid_format)


class GeometryTypeField(GeometryField):
    default_error_messages = {
        "invalid_type": _("Geometry must be one of: {types}."),
    }

    def __init__(
        self,
        geometry_type=None,
        coerce_multi=False,
        destination_srid=4326,
        **kwargs,
    ):
        self._allowed_types = self._normalize_types(geometry_type)
        self.coerce_multi = coerce_multi
        self.destination_srid = destination_srid
        super().__init__(**kwargs)

    def _normalize_types(self, geometry_type):
        if geometry_type is None:
            return None
        if isinstance(geometry_type, (list, tuple, set)):
            values = geometry_type
        else:
            values = (geometry_type,)
        return tuple(value.upper() for value in values)

    def to_internal_value(self, value):
        geometry = super().to_internal_value(value)
        if geometry is None:
            return geometry
        geometry = self._maybe_promote(geometry)
        geometry = self._maybe_transform(geometry)
        self._validate_geometry_type(geometry)
        return geometry

    def _maybe_promote(self, geometry):
        result = geometry
        if self.coerce_multi:
            geom_type = geometry.geom_type.upper()
            if geom_type == "POLYGON":
                result = MultiPolygon(geometry)
            elif geom_type == "LINESTRING":
                result = MultiLineString(geometry)
            elif geom_type == "POINT":
                result = MultiPoint(geometry)
        return result

    def _maybe_transform(self, geometry):
        if self.destination_srid != 4326:
            if geometry.srid is None:
                geometry.srid = self.destination_srid
            elif geometry.srid != self.destination_srid:
                geometry.transform(self.destination_srid)
        return geometry

    def _validate_geometry_type(self, geometry):
        if not self._allowed_types:
            return
        geom_type = geometry.geom_type.upper()
        if geom_type not in self._allowed_types:
            allowed = ", ".join(self._allowed_types)
            self.fail("invalid_type", types=allowed)
