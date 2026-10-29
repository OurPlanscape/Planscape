import tempfile
from io import StringIO
from pathlib import Path

from django.core.management import call_command
from django.test import TestCase

from datasets.tests.factories import DataLayerFactory, SimpleCategoryFactory

CSV_CONTENT = """,,Some review note,
ID,Layer,Category,Description
1,  annual   BURN probability ,Fire Dynamics,foo
2,Canopy Height,Forest and Shrubland Resilience,bar
3,Missing Layer,Carbon Storage,baz
4,No Category Layer,,qux
"""


class AssignSimpleCategoriesCommandTest(TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.csv_path = Path(self.tmpdir.name) / "layers.csv"
        self.csv_path.write_text(CSV_CONTENT)

    def tearDown(self):
        self.tmpdir.cleanup()

    def _run(self, **options):
        out, err = StringIO(), StringIO()
        call_command(
            "assign_simple_categories",
            str(self.csv_path),
            stdout=out,
            stderr=err,
            **options,
        )
        return out.getvalue(), err.getvalue()

    def test_matches_by_normalized_name_and_replaces_categories(self):
        old_category = SimpleCategoryFactory.create(name="Old")
        datalayer = DataLayerFactory.create(
            name="Annual Burn Probability", simple_categories=[old_category]
        )

        self._run()

        self.assertEqual(
            list(datalayer.simple_categories.values_list("name", flat=True)),
            ["Fire Dynamics"],
        )

    def test_updates_all_datalayers_with_same_name(self):
        first = DataLayerFactory.create(name="Canopy Height")
        second = DataLayerFactory.create(name="Canopy Height")

        out, _ = self._run()

        for datalayer in (first, second):
            self.assertEqual(
                list(datalayer.simple_categories.values_list("name", flat=True)),
                ["Forest and Shrubland Resilience"],
            )
        self.assertIn("matched 2 datalayers", out)

    def test_dry_run_does_not_save(self):
        datalayer = DataLayerFactory.create(name="Canopy Height")

        out, _ = self._run(dry_run=True)

        self.assertFalse(datalayer.simple_categories.exists())
        self.assertIn("[DRY RUN]", out)

    def test_reports_unmatched_names(self):
        _, err = self._run()

        self.assertIn("no datalayer named 'Missing Layer'", err)
        self.assertNotIn("No Category Layer", err)
