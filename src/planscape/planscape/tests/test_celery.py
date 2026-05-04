from django.test import SimpleTestCase, override_settings

from planscape.celery import get_catalog_backup_schedule, get_catalog_restore_schedule


class TestCatalogBeatSchedule(SimpleTestCase):
    @override_settings(
        CATALOG_BACKUP_CRON="15 2 * * 1",
        CATALOG_RESTORE_ENABLED=True,
        CATALOG_RESTORE_CRON="0 6 * * 0",
    )
    def test_catalog_backup_and_restore_schedules_use_cron_env_vars(self):
        backup_schedule = get_catalog_backup_schedule()
        restore_schedule = get_catalog_restore_schedule()

        self.assertEqual(
            backup_schedule["generate-catalog-backup"]["task"],
            "core.tasks.generate_backup_data_task",
        )
        self.assertEqual(
            backup_schedule["generate-catalog-backup"]["schedule"]._orig_minute,
            "15",
        )
        self.assertEqual(
            restore_schedule["load-catalog-backup"]["task"],
            "core.tasks.load_latest_catalog_backup_task",
        )
        self.assertEqual(
            restore_schedule["load-catalog-backup"]["schedule"]._orig_hour,
            "6",
        )
