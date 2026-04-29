from django.contrib.auth.models import User
from django.db import models


class UserProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    last_returning_user_bucket = models.PositiveIntegerField(default=0)
    last_returning_user_event_at = models.DateTimeField(null=True, blank=True)

    def __str__(self) -> str:
        return f"UserProfile(user_id={self.user_id})"
