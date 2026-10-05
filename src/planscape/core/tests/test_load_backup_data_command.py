import subprocess
from unittest import mock

from django.core.management import call_command
from django.test import SimpleTestCase, TestCase, override_settings

from core.models import RestoreBackTrack, RestoreBackTrackStatus


@override_settings(ENV="dev", BACKUPS_PATH="/tmp/backups")
class TestLoadBackupDataCommand(SimpleTestCase):
    @mock.patch("core.management.commands.load_backup_data.input", return_value="n")
    def test_command_prompts_for_confirmation_by_default(self, input_mock):
        with self.assertRaises(SystemExit):
            call_command("load_backup_data")

        input_mock.assert_called_once_with("Confirm to proceed with process? (y,N)")

    @mock.patch(
        "core.management.commands.load_backup_data.os.path.exists", return_value=False
    )
    @mock.patch("core.management.commands.load_backup_data.input")
    def test_force_skips_confirmation_prompt(self, input_mock, _exists_mock):
        with self.assertRaises(SystemError):
            call_command("load_backup_data", force=True)

        input_mock.assert_not_called()


@override_settings(
    ENV="dev",
    BACKUPS_PATH="/tmp/backups",
    STORAGE_SERVICE_ACCOUNT="storage@example.com",
)
class TestLoadBackupDataCommandRsync(TestCase):
    @mock.patch("core.management.commands.load_backup_data.CatalogImporter.from_file")
    @mock.patch("core.management.commands.load_backup_data.post_to_mattermost")
    @mock.patch("core.management.commands.load_backup_data.subprocess.run")
    @mock.patch(
        "core.management.commands.load_backup_data.os.path.exists", return_value=True
    )
    def test_rsync_failure_marks_restore_failed_and_raises(
        self,
        _exists_mock,
        subprocess_run_mock,
        post_to_mattermost_mock,
        importer_mock,
    ):
        subprocess_run_mock.side_effect = subprocess.CalledProcessError(
            returncode=1,
            cmd=["gcloud", "storage", "rsync"],
        )
        with self.assertRaises(subprocess.CalledProcessError):
            call_command("load_backup_data", force=True)
        subprocess_run_mock.assert_called_once_with(
            [
                "gcloud",
                "storage",
                "rsync",
                "--account=storage@example.com",
                "gs://planscape-datastore-production/datalayers",
                "gs://planscape-datastore-dev/datalayers",
                "--recursive",
            ],
            check=True,
        )
        current_run = RestoreBackTrack.objects.latest("id")
        self.assertEqual(current_run.status, RestoreBackTrackStatus.FAILED)
        self.assertIsNotNone(current_run.finished_at)
        post_to_mattermost_mock.assert_called_once()
        importer_mock.return_value.merge.assert_not_called()

    @mock.patch("core.management.commands.load_backup_data.datalayer_uploaded.delay")
    @mock.patch("core.management.commands.load_backup_data.CatalogImporter.from_file")
    @mock.patch("core.management.commands.load_backup_data.post_to_mattermost")
    @mock.patch("core.management.commands.load_backup_data.subprocess.run")
    @mock.patch(
        "core.management.commands.load_backup_data.os.path.exists", return_value=True
    )
    def test_first_restore_schedules_destination_vectors_after_commit(
        self,
        _exists,
        rsync,
        _notify,
        importer_mock,
        delay,
    ):
        RestoreBackTrack.objects.all().delete()
        importer_mock.return_value.counts = {}
        importer_mock.return_value.vector_ids = [456, 789]
        with self.captureOnCommitCallbacks(execute=True) as callbacks:
            call_command("load_backup_data", force=True, batch_size=1)
            delay.assert_not_called()
        self.assertEqual(len(callbacks), 2)
        delay.assert_has_calls([mock.call(456), mock.call(789)])
        importer_mock.return_value.merge.assert_called_once()
        self.assertEqual(
            RestoreBackTrack.objects.latest("id").status, RestoreBackTrackStatus.SUCCESS
        )

    @mock.patch("core.management.commands.load_backup_data.CatalogImporter.from_file")
    @mock.patch("core.management.commands.load_backup_data.post_to_mattermost")
    @mock.patch("core.management.commands.load_backup_data.subprocess.run")
    @mock.patch(
        "core.management.commands.load_backup_data.os.path.exists", return_value=True
    )
    def test_preflight_failure_prevents_bucket_sync(
        self, _exists, rsync, _notify, importer_mock
    ):
        from django.core.management.base import CommandError

        importer_mock.side_effect = CommandError("Invalid fixture")
        with self.assertRaises(CommandError):
            call_command("load_backup_data", force=True)
        rsync.assert_not_called()
        self.assertEqual(
            RestoreBackTrack.objects.latest("id").status, RestoreBackTrackStatus.FAILED
        )
