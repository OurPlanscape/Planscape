from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase


class CreateTilesTest(TestCase):
    def call_command(self, *args, **kwargs) -> str:
        out = StringIO()
        call_command("create_tiles", *args, stdout=out, stderr=StringIO(), **kwargs)
        return out.getvalue()

    def test_missing_data_directory(self):
        self.assertRaises(CommandError, self.call_command)

    def test_bad_region(self):
        self.assertRaises(
            CommandError, self.call_command, "/test/dir", "--region_name=foo"
        )

    def test_bad_colormap(self):
        self.assertRaises(
            CommandError, self.call_command, "/test/dir", "--colormap=foo"
        )

    def test_good_colormap(self):
        out = self.call_command("/test/dir", "--colormap=turbo")
        self.assertIn("Converting", out)
