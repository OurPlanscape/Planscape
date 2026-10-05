from django.contrib import admin
from django.test import SimpleTestCase

from core.admin import RestoreBackTrackAdmin
from core.models import RestoreBackTrack


class RestoreBackTrackAdminTest(SimpleTestCase):
    def test_restore_backtrack_is_registered_for_updates(self):
        model_admin = admin.site._registry[RestoreBackTrack]

        self.assertIsInstance(model_admin, RestoreBackTrackAdmin)
        self.assertEqual(
            model_admin.list_display,
            ("id", "file_name", "status", "started_at", "finished_at"),
        )
        self.assertEqual(model_admin.list_filter, ("status",))
        self.assertEqual(model_admin.search_fields, ("file_name",))
        self.assertEqual(model_admin.ordering, ("-started_at",))
        self.assertEqual(model_admin.readonly_fields, ("started_at",))
