from django.core.management.base import CommandError
from django.test import TestCase, override_settings

from core.base_commands import PlanscapeCommand


class TestRequireCatalogEnv(TestCase):
    def setUp(self):
        self.command = PlanscapeCommand()

    @override_settings(ENV="dev")
    def test_raises_in_dev(self):
        with self.assertRaises(CommandError) as ctx:
            self.command.require_catalog_env()
        self.assertIn("catalog", str(ctx.exception))

    @override_settings(ENV="staging")
    def test_raises_in_staging(self):
        with self.assertRaises(CommandError):
            self.command.require_catalog_env()

    @override_settings(ENV="production")
    def test_raises_in_production(self):
        with self.assertRaises(CommandError):
            self.command.require_catalog_env()

    @override_settings(ENV="catalog")
    def test_does_not_raise_in_catalog(self):
        self.command.require_catalog_env()  # must not raise
