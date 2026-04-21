from django.test import SimpleTestCase, override_settings

from planscape.celery import get_catalog_restore_schedule


class TestCatalogRestoreBeatSchedule(SimpleTestCase):
    @override_settings(CATALOG_RESTORE_ENABLED=False)
    def test_restore_schedule_is_disabled(self):
        self.assertEqual(get_catalog_restore_schedule(), {})

    @override_settings(
        CATALOG_RESTORE_ENABLED=True,
        CATALOG_RESTORE_CRON_MINUTE="0",
        CATALOG_RESTORE_CRON_HOUR="6",
        CATALOG_RESTORE_CRON_DAY_OF_WEEK="0",
        CATALOG_RESTORE_CRON_DAY_OF_MONTH="*",
        CATALOG_RESTORE_CRON_MONTH_OF_YEAR="*",
    )
    def test_restore_schedule_uses_generic_env_vars(self):
        schedule = get_catalog_restore_schedule()

        self.assertIn("load-catalog-backup", schedule)
        entry = schedule["load-catalog-backup"]

        self.assertEqual(entry["task"], "core.tasks.load_latest_catalog_backup_task")
        self.assertNotIn("kwargs", entry)
        self.assertEqual(entry["schedule"]._orig_minute, "0")
        self.assertEqual(entry["schedule"]._orig_hour, "6")
        self.assertEqual(entry["schedule"]._orig_day_of_week, "0")
        self.assertEqual(entry["schedule"]._orig_day_of_month, "*")
        self.assertEqual(entry["schedule"]._orig_month_of_year, "*")
