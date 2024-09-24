# from django.db import models
# from django.contrib.auth import get_user_model
# from core.models import CreatedAtMixin, UUIDMixin, UpdatedAtMixin, DeletedAtMixin

# User = get_user_model()


# class Organization(
#     UUIDMixin,
#     CreatedAtMixin,
#     UpdatedAtMixin,
#     DeletedAtMixin,
#     models.Model,
# ):
#     created_by = models.ForeignKey(
#         User,
#         on_delete=models.RESTRICT,
#         related_name="created_organizations",
#         null=True,
#     )

#     name = models.CharField(max_length=128)

#     class Meta:
#         verbose_name = "Organization"
#         verbose_name_plural = "Organizations"
