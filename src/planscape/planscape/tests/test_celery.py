from django.test import SimpleTestCase, override_settings

from planscape.celery import (
    get_catalog_backup_schedule,
    get_catalog_restore_schedule,
    get_forisk_mills_schedule,
    get_twig_treatments_schedule,
)


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

    @override_settings(FORISK_MILLS_CRON="30 5 * * *")
    def test_forisk_mills_schedule_uses_cron_env_var(self):
        schedule = get_forisk_mills_schedule()

        self.assertEqual(
            schedule["refresh-forisk-mill-layers"]["task"],
            "datasets.tasks.refresh_forisk_mill_layers_task",
        )
        self.assertEqual(
            schedule["refresh-forisk-mill-layers"]["schedule"]._orig_minute,
            "30",
        )

    @override_settings(TWIG_TREATMENTS_CRON="30 5 1 * *")
    def test_twig_treatments_schedule_uses_cron_env_var(self):
        schedule = get_twig_treatments_schedule()

        self.assertEqual(
            schedule["refresh-twig-treatment-layers"]["task"],
            "datasets.tasks.refresh_twig_treatment_layers_task",
        )
        self.assertEqual(
            schedule["refresh-twig-treatment-layers"]["schedule"]._orig_minute,
            "30",
        )
        self.assertEqual(
            schedule["refresh-twig-treatment-layers"]["schedule"]._orig_hour,
            "5",
        )
        self.assertEqual(
            schedule["refresh-twig-treatment-layers"]["schedule"]._orig_day_of_month,
            "1",
        )
