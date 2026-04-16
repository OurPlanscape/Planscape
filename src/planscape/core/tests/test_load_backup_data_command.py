from unittest import mock

from django.core.management import call_command
from django.test import SimpleTestCase, override_settings


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
