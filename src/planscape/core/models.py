from uuid import uuid4
from django.db import models
from django.utils import timezone


class CreatedAtMixin(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, null=True)

    class Meta:
        abstract = True


class UpdatedAtMixin(models.Model):
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class AliveObjectsManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(deleted_at=None)


class DeletedAtMixin(models.Model):
    objects = AliveObjectsManager()
    dead_or_alive = models.Manager()

    deleted_at = models.DateTimeField(
        verbose_name="Deleted at",
        help_text="Define if the entity has been deleted or not and when",
        null=True,
    )

    def delete(self, *args, **kwargs):
        """
        Overrides delete method to support soft-deletes
        and hard-deletes.
        The default mode is soft-delete.
        """
        hard_delete = kwargs.get("hard_delete", False)
        if hard_delete:
            super().delete()
        else:
            try:
                self.deleted_at = timezone.now()
                self.save()
            except Exception:
                self.deleted_at = None
                raise

    class Meta:
        abstract = True


class UUIDMixin(models.Model):
    uuid = models.UUIDField(default=uuid4, db_index=True)

    class Meta:
        abstract = True
