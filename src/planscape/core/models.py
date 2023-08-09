from django.db import models


class CreatedAtMixin(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        abstract = True


class UpdatedAtMixin(models.Model):
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class DeletedAtMixin(models.Model):
    deleted_at = models.DateTimeField(null=True)

    class Meta:
        abstract = True
