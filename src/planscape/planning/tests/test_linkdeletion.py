import json

from django.contrib.auth.models import User
from django.test import TransactionTestCase

from planning.models import SharedLink
import planning.cron as cron
from django.utils import timezone


class DeleteOldLinksTest(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create(username="testuser")
        self.user.set_password("12345")
        self.user.save()

    def test_delete_old_links(self):
        one_month_ago = timezone.now() - timezone.timedelta(days=31)
        two_months_ago = timezone.now() - timezone.timedelta(days=61)
        two_years_ago = timezone.now() - timezone.timedelta(days=730)
        link_today = SharedLink.objects.create(
            user=self.user,
            view_state=json.dumps({"ok": "test"}),
        )
        link_one_month_old = SharedLink.objects.create(
            user=self.user,
            view_state=json.dumps({"ok": "test"}),
        )
        link_two_months_old = SharedLink.objects.create(
            user=self.user,
            view_state=json.dumps({"ok": "test"}),
        )
        link_two_years_old = SharedLink.objects.create(
            user=self.user,
            view_state=json.dumps({"ok": "test"}),
        )
        link_today.save()
        link_one_month_old.created_at = one_month_ago
        link_one_month_old.save()
        link_two_months_old.created_at = two_months_ago
        link_two_months_old.save()
        link_two_years_old.created_at = two_years_ago
        link_two_years_old.save()

        self.assertEqual(SharedLink.objects.count(), 4)

        cron.delete_old_shared_links(60)  # this should delete two of the links

        self.assertEqual(SharedLink.objects.count(), 2)
