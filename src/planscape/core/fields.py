from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ObjectDoesNotExist
from rest_framework.relations import RelatedField
from django.utils.encoding import smart_str


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
                "Invalid format for uuid representation. "
                'Must be one of "{}"'.format('", "'.join(self.valid_formats))
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
