from django.core.exceptions import ValidationError
from django.test import TestCase

from datasets.models import validate_dataset_modules
from modules.base import MODULE_HANDLERS


class ValidateDatasetModulesTest(TestCase):
    def test_allows_none(self):
        validate_dataset_modules(None)

    def test_allows_known_modules(self):
        modules = list(MODULE_HANDLERS.keys())
        validate_dataset_modules(modules[:1])

    def test_rejects_unknown_modules(self):
        with self.assertRaises(ValidationError):
            validate_dataset_modules(["not-a-module"])
