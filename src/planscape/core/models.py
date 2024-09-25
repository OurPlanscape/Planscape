from typing import Dict, Tuple
from uuid import uuid4
from django.db import models
from django.utils import timezone
from django_stubs_ext.db.models import TypedModelMeta


class CreatedAtMixin(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, null=True)

    class Meta(TypedModelMeta):
        abstract = True


class UpdatedAtMixin(models.Model):
    updated_at = models.DateTimeField(auto_now=True)

    class Meta(TypedModelMeta):
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

    def delete(self, *args, **kwargs) -> Tuple[int, Dict[str, int]]:
        """
        Overrides delete method to support soft-deletes
        and hard-deletes.
        The default mode is soft-delete.
        """
        hard_delete = kwargs.get("hard_delete", False)
        if hard_delete:
            return super().delete(*args, **kwargs)
        else:
            try:
                self.deleted_at = timezone.now()
                self.save()
                model_name = f"{self._meta.app_label}.{self._meta.object_name}"
                return 1, {model_name: 1}
            except Exception:
                self.deleted_at = None
                raise

    class Meta(TypedModelMeta):
        abstract = True


class UUIDMixin(models.Model):
    uuid = models.UUIDField(default=uuid4, db_index=True)

    class Meta(TypedModelMeta):
        abstract = True
