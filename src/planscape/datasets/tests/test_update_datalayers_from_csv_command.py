import tempfile
from io import StringIO
from pathlib import Path
from unittest import mock

from django.core.management import call_command
from django.test import TestCase

from datasets.tests.factories import (
    DataLayerFactory,
    DatasetFactory,
    SimpleCategoryFactory,
)

HEADER = (
    "ID - Production,Layer,Data Layer,Base Layer,"
    "ForSys (Priority Objective & Co-Benefit),Climate Forsight,Include,Exclude,"
    'Adv. Stand-Level Constraint,"Metric \nSee List",Category,,Description,'
    "Dataset Name,Data Creator,Geographic Coverage,Units,Vintage,"
    "[Learn More](Hyperlink)"
)

CSV_CONTENT = f""",,,,,,,,What is metadata format?,Review,,,,,,,,,
{HEADER}
1,  annual   BURN probability ,TRUE,FALSE,TRUE,FALSE,FALSE,TRUE,TRUE,majority,Fire Dynamics,,Burn description,LANDFIRE,LANDFIRE,California,Probability,2020,https://example.test/burn
2,Canopy Height,FALSE,FALSE,FALSE,TRUE,FALSE,FALSE,FALSE,N/A,,,,,,,n/a,n/a,
3,Missing Layer,TRUE,FALSE,FALSE,FALSE,FALSE,FALSE,FALSE,avg,Carbon Storage,,,,,,,,
4,Conflicting Layer,TRUE,FALSE,FALSE,FALSE,FALSE,FALSE,FALSE,avg,,,,,,,,,
5,Conflicting Layer,FALSE,FALSE,FALSE,FALSE,FALSE,FALSE,FALSE,avg,,,,,,,,,
6,Hazard,FALSE,FALSE,FALSE,TRUE,FALSE,FALSE,FALSE,N/A,,,,State Metrics,,,,,
7,Hazard,FALSE,FALSE,FALSE,FALSE,FALSE,FALSE,TRUE,N/A,,,,National Risk,,,,,
"""


class UpdateDataLayersFromCSVCommandTest(TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.csv_path = Path(self.tmpdir.name) / "layers.csv"
        self.csv_path.write_text(CSV_CONTENT)

    def tearDown(self):
        self.tmpdir.cleanup()

    def _run(self, **options):
        out, err = StringIO(), StringIO()
        call_command(
            "update_datalayers_from_csv",
            str(self.csv_path),
            stdout=out,
            stderr=err,
            **options,
        )
        return out.getvalue(), err.getvalue()

    def test_sets_modules_and_keeps_unrelated_metadata(self):
        datalayer = DataLayerFactory.create(
            name="Annual Burn Probability",
            metadata={
                "modules": {
                    "forsys": {
                        "enabled": False,
                        "name": "burn",
                        "capabilities": ["THRESHOLD", "INCLUSION_ZONE"],
                    },
                    "impacts": {"year": 2024},
                    "map": {"enabled": False, "tooltip_format": "{value}"},
                }
            },
        )

        self._run()

        datalayer.refresh_from_db()
        modules = datalayer.metadata["modules"]
        self.assertEqual(
            modules["forsys"],
            {
                "enabled": True,
                "name": "burn",
                "capabilities": [
                    "THRESHOLD",
                    "PRIORITY",
                    "SECONDARY_METRIC",
                    "EXCLUSION_ZONE",
                ],
                "metric_column": "majority",
            },
        )
        self.assertEqual(modules["impacts"], {"year": 2024})
        self.assertEqual(modules["map"], {"enabled": True, "tooltip_format": "{value}"})
        self.assertEqual(modules["advanced_stand_level_constraint"], {"enabled": True})
        self.assertNotIn("climate_foresight", modules)

    def test_disables_existing_modules_without_creating_missing_ones(self):
        datalayer = DataLayerFactory.create(
            name="Canopy Height",
            metadata={
                "modules": {
                    "map": {"enabled": True},
                    "forsys": {"enabled": True, "capabilities": ["PRIORITY"]},
                }
            },
        )

        self._run()

        datalayer.refresh_from_db()
        self.assertEqual(
            datalayer.metadata["modules"],
            {
                "map": {"enabled": False},
                "forsys": {"enabled": False, "capabilities": []},
                "climate_foresight": {"enabled": True},
            },
        )
        self.assertNotIn("metadata", datalayer.metadata)

    def test_writes_descriptive_metadata(self):
        datalayer = DataLayerFactory.create(
            name="Annual Burn Probability",
            metadata={"metadata": {"identification": {"title": "Burn"}}},
        )

        self._run()

        datalayer.refresh_from_db()
        self.assertEqual(
            datalayer.metadata["metadata"],
            {
                "identification": {
                    "title": "Burn",
                    "description": "Burn description",
                    "geographicCoverage": "California",
                    "keywords": {"units": {"keywords": ["Probability"]}},
                    "date": {"date": "2020"},
                },
                "distribution": {
                    "download": {
                        "url": "https://example.test/burn",
                        "name": "LANDFIRE",
                    }
                },
            },
        )

    def test_assigns_simple_category(self):
        old_category = SimpleCategoryFactory.create(name="Old")
        datalayer = DataLayerFactory.create(
            name="Annual Burn Probability", simple_categories=[old_category]
        )

        self._run()

        self.assertEqual(
            list(datalayer.simple_categories.values_list("name", flat=True)),
            ["Fire Dynamics"],
        )

    def test_dry_run_does_not_save(self):
        datalayer = DataLayerFactory.create(name="Annual Burn Probability")
        original = datalayer.metadata

        out, _ = self._run(dry_run=True)

        datalayer.refresh_from_db()
        self.assertEqual(datalayer.metadata, original)
        self.assertFalse(datalayer.simple_categories.exists())
        self.assertIn("[DRY RUN]", out)
        self.assertIn("modules.forsys.enabled", out)

    def test_matches_by_dataset_when_rows_with_same_name_differ(self):
        state = DataLayerFactory.create(
            name="Hazard", dataset=DatasetFactory.create(name="State Metrics")
        )
        national = DataLayerFactory.create(
            name="Hazard", dataset=DatasetFactory.create(name="National Risk")
        )
        other = DataLayerFactory.create(
            name="Hazard", dataset=DatasetFactory.create(name="Uploaded")
        )

        self._run()

        for datalayer in (state, national, other):
            datalayer.refresh_from_db()
        self.assertEqual(
            state.metadata["modules"], {"climate_foresight": {"enabled": True}}
        )
        self.assertEqual(
            national.metadata["modules"],
            {"advanced_stand_level_constraint": {"enabled": True}},
        )
        self.assertEqual(other.metadata, {})

    @mock.patch(
        "datasets.management.commands.update_datalayers_from_csv.storage.Client"
    )
    def test_reads_csv_from_gcs(self, client):
        bucket = client.return_value.bucket
        bucket.return_value.get_blob.return_value.download_as_text.return_value = (
            CSV_CONTENT
        )
        datalayer = DataLayerFactory.create(name="Canopy Height")

        call_command(
            "update_datalayers_from_csv",
            "gs://planscape-scratch/layers.csv",
            stdout=StringIO(),
            stderr=StringIO(),
        )

        bucket.assert_called_once_with("planscape-scratch")
        bucket.return_value.get_blob.assert_called_once_with("layers.csv")
        datalayer.refresh_from_db()
        self.assertEqual(
            datalayer.metadata["modules"], {"climate_foresight": {"enabled": True}}
        )

    def test_reports_unmatched_and_conflicting_rows(self):
        datalayer = DataLayerFactory.create(name="Conflicting Layer", metadata=None)

        _, err = self._run()

        datalayer.refresh_from_db()
        self.assertIsNone(datalayer.metadata)
        self.assertIn("no datalayer named 'Missing Layer'", err)
        self.assertIn("'Conflicting Layer' has conflicting rows", err)
