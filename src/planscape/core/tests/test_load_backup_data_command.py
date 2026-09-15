import subprocess
from unittest import mock

from django.core.management import call_command
from django.test import SimpleTestCase, TestCase, override_settings
from django.utils import timezone

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
    @mock.patch("core.management.commands.load_backup_data.call_command")
    @mock.patch("core.management.commands.load_backup_data.shutil.copyfile")
    @mock.patch("core.management.commands.load_backup_data.subprocess.call")
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
        subprocess_call_mock,
        copyfile_mock,
        call_command_mock,
    ):
        RestoreBackTrack.objects.create(
            file_name="latest_production_backup.json",
            started_at=timezone.now(),
            status=RestoreBackTrackStatus.SUCCESS,
        )
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
        subprocess_call_mock.assert_not_called()
        copyfile_mock.assert_not_called()
        call_command_mock.assert_not_called()
