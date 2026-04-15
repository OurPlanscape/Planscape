from unittest import mock

from django.core.cache import cache
from django.test import TestCase, override_settings
from django.urls import reverse

from core.backup_state import (
    BACKUP_STATE_FAILED,
    BACKUP_STATE_QUEUED,
    BACKUP_STATE_RUNNING,
    BACKUP_STATE_SUCCESS,
    acquire_backup_lock,
    acquire_restore_lock,
    get_backup_status,
    get_restore_status,
    is_backup_active,
    is_backup_locked,
    is_restore_active,
    is_restore_locked,
    set_backup_status,
    set_restore_status,
)
from core.tasks import generate_backup_data_task, load_latest_catalog_backup_task
from planscape.tests.factories import UserFactory


TEST_CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "admin-backup-tests",
    }
}


@override_settings(CACHES=TEST_CACHES)
class TestAdminBackupTrigger(TestCase):
    def setUp(self) -> None:
        cache.clear()
        self.superuser = UserFactory.create(is_staff=True, is_superuser=True)
        self.user = UserFactory.create(is_staff=True, is_superuser=False)
        self.index_url = reverse("admin:index")
        self.trigger_url = reverse("admin:trigger_backup_data")
        self.restore_url = reverse("admin:trigger_restore_data")

    def test_index_shows_enabled_button_when_backup_not_running(self):
        self.client.force_login(self.superuser)

        response = self.client.get(self.index_url)

        self.assertContains(response, "Run backup")
        self.assertNotContains(response, "Backup in progress")
        self.assertContains(response, "Restore from latest catalog")
        self.assertNotContains(response, "Restore in progress")

    def test_index_shows_disabled_button_when_backup_running(self):
        self.client.force_login(self.superuser)
        acquire_backup_lock()
        set_backup_status(BACKUP_STATE_QUEUED)

        response = self.client.get(self.index_url)

        self.assertContains(response, "Backup in progress")
        self.assertContains(response, "disabled")

    def test_non_superuser_cannot_trigger_backup(self):
        self.client.force_login(self.user)

        response = self.client.post(self.trigger_url)

        self.assertEqual(response.status_code, 302)
        self.assertFalse(is_backup_locked())
        self.assertFalse(is_backup_active())

    def test_trigger_backup_queues_task_and_sets_lock(self):
        self.client.force_login(self.superuser)

        with mock.patch(
            "admin.admin_config.generate_backup_data_task.delay"
        ) as delay_mock:
            delay_mock.return_value.id = "task-123"

            response = self.client.post(self.trigger_url, follow=True)

        self.assertEqual(response.status_code, 200)
        delay_mock.assert_called_once_with()
        self.assertFalse(is_backup_locked())
        self.assertTrue(is_backup_active())
        self.assertEqual(get_backup_status()["state"], BACKUP_STATE_QUEUED)
        self.assertContains(response, "Backup queued.")

    def test_trigger_backup_does_not_queue_duplicate_task(self):
        self.client.force_login(self.superuser)
        acquire_backup_lock()
        set_backup_status(BACKUP_STATE_QUEUED)

        with mock.patch(
            "admin.admin_config.generate_backup_data_task.delay"
        ) as delay_mock:
            response = self.client.post(self.trigger_url, follow=True)

        self.assertEqual(response.status_code, 200)
        delay_mock.assert_not_called()
        self.assertContains(response, "A backup is already queued or running.")

    def test_index_shows_disabled_restore_button_when_restore_running(self):
        self.client.force_login(self.superuser)
        acquire_restore_lock()
        set_restore_status(BACKUP_STATE_QUEUED)

        response = self.client.get(self.index_url)

        self.assertContains(response, "Restore in progress")
        self.assertContains(response, "disabled")

    def test_non_superuser_cannot_trigger_restore(self):
        self.client.force_login(self.user)

        response = self.client.post(self.restore_url)

        self.assertEqual(response.status_code, 302)
        self.assertFalse(is_restore_locked())
        self.assertFalse(is_restore_active())

    def test_trigger_restore_queues_task_and_sets_status(self):
        self.client.force_login(self.superuser)

        with mock.patch(
            "admin.admin_config.load_latest_catalog_backup_task.delay"
        ) as delay_mock:
            delay_mock.return_value.id = "task-restore-123"

            response = self.client.post(self.restore_url, follow=True)

        self.assertEqual(response.status_code, 200)
        delay_mock.assert_called_once_with()
        self.assertFalse(is_restore_locked())
        self.assertTrue(is_restore_active())
        self.assertEqual(get_restore_status()["state"], BACKUP_STATE_QUEUED)
        self.assertContains(response, "Restore queued.")

    def test_trigger_restore_does_not_queue_duplicate_task(self):
        self.client.force_login(self.superuser)
        acquire_restore_lock()
        set_restore_status(BACKUP_STATE_QUEUED)

        with mock.patch(
            "admin.admin_config.load_latest_catalog_backup_task.delay"
        ) as delay_mock:
            response = self.client.post(self.restore_url, follow=True)

        self.assertEqual(response.status_code, 200)
        delay_mock.assert_not_called()
        self.assertContains(response, "A restore is already queued or running.")


@override_settings(CACHES=TEST_CACHES)
class TestGenerateBackupDataTask(TestCase):
    def setUp(self) -> None:
        cache.clear()

    def test_task_runs_command_and_releases_lock(self):
        set_backup_status(BACKUP_STATE_QUEUED)

        with mock.patch("core.tasks.call_command") as call_command_mock:
            generate_backup_data_task.run()

        call_command_mock.assert_called_once_with("generate_backup_data")
        self.assertFalse(is_backup_locked())
        self.assertEqual(get_backup_status()["state"], BACKUP_STATE_SUCCESS)

    def test_task_marks_failure_and_releases_lock(self):
        set_backup_status(BACKUP_STATE_QUEUED)

        with mock.patch("core.tasks.call_command", side_effect=RuntimeError("boom")):
            with self.assertRaises(RuntimeError):
                generate_backup_data_task.run()

        self.assertFalse(is_backup_locked())
        status = get_backup_status()
        self.assertEqual(status["state"], BACKUP_STATE_FAILED)
        self.assertEqual(status["error"], "boom")

    def test_task_fails_if_lock_already_held(self):
        acquire_backup_lock()
        set_backup_status(BACKUP_STATE_RUNNING)

        with mock.patch("core.tasks.call_command") as call_command_mock:
            with self.assertRaises(RuntimeError):
                generate_backup_data_task.run()

        call_command_mock.assert_not_called()
        self.assertTrue(is_backup_locked())
        self.assertEqual(get_backup_status()["state"], BACKUP_STATE_RUNNING)


@override_settings(CACHES=TEST_CACHES)
class TestLoadLatestCatalogBackupTask(TestCase):
    def setUp(self) -> None:
        cache.clear()

    def test_task_runs_command_and_releases_lock(self):
        set_restore_status(BACKUP_STATE_QUEUED)

        with mock.patch("core.tasks.call_command") as call_command_mock:
            load_latest_catalog_backup_task.run()

        call_command_mock.assert_called_once_with("load_backup_data", force=True)
        self.assertFalse(is_restore_locked())
        self.assertEqual(get_restore_status()["state"], BACKUP_STATE_SUCCESS)

    def test_task_marks_failure_and_releases_lock(self):
        set_restore_status(BACKUP_STATE_QUEUED)

        with mock.patch("core.tasks.call_command", side_effect=RuntimeError("boom")):
            with self.assertRaises(RuntimeError):
                load_latest_catalog_backup_task.run()

        self.assertFalse(is_restore_locked())
        status = get_restore_status()
        self.assertEqual(status["state"], BACKUP_STATE_FAILED)
        self.assertEqual(status["error"], "boom")

    def test_task_fails_if_lock_already_held(self):
        acquire_restore_lock()
        set_restore_status(BACKUP_STATE_RUNNING)

        with mock.patch("core.tasks.call_command") as call_command_mock:
            with self.assertRaises(RuntimeError):
                load_latest_catalog_backup_task.run()

        call_command_mock.assert_not_called()
        self.assertTrue(is_restore_locked())
        self.assertEqual(get_restore_status()["state"], BACKUP_STATE_RUNNING)
