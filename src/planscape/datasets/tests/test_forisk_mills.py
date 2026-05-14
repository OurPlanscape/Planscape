import json
import tempfile
from pathlib import Path
from unittest.mock import Mock

from django.test import SimpleTestCase

from datasets.forisk_mills import (
    fetch_forisk_feature_collection,
    write_forisk_mill_files,
)


class ForiskMillsTest(SimpleTestCase):
    def setUp(self):
        self.feature_collection = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {"Status": "Open", "Recycled%": 12},
                    "geometry": {"type": "Point", "coordinates": [-120, 38]},
                },
                {
                    "type": "Feature",
                    "properties": {"Status": "Closed", "Recycled%": 34},
                    "geometry": {"type": "Point", "coordinates": [-121, 39]},
                },
                {
                    "type": "Feature",
                    "properties": {"Status": "Announced", "Recycled%": 56},
                    "geometry": {"type": "Point", "coordinates": [-122, 40]},
                },
            ],
        }

    def test_fetch_rejects_non_feature_collection(self):
        response = Mock()
        response.json.return_value = {"foo": "bar"}
        response.raise_for_status.return_value = None
        session = Mock()
        session.get.return_value = response

        with self.assertRaises(ValueError):
            fetch_forisk_feature_collection(
                sub_key="subkey",
                user_key="userkey",
                api_url="https://example.test/forisk",
                session=session,
            )

    def test_fetch_passes_forisk_credentials(self):
        response = Mock()
        response.json.return_value = self.feature_collection
        response.raise_for_status.return_value = None
        session = Mock()
        session.get.return_value = response

        fetch_forisk_feature_collection(
            sub_key="subkey",
            user_key="userkey",
            api_url="https://example.test/forisk",
            session=session,
        )

        request_kwargs = session.get.call_args.kwargs
        self.assertEqual(request_kwargs["params"]["SubKey"], "subkey")
        self.assertEqual(request_kwargs["params"]["Userkey"], "userkey")

    def test_write_forisk_mill_files_splits_and_normalizes_files(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            output_files = write_forisk_mill_files(
                feature_collection=self.feature_collection,
                output_dir=Path(tmpdir),
            )

            self.assertEqual(
                set(output_files.keys()),
                {"Open Mills", "Closed Mills", "Announced Mills"},
            )
            open_data = json.loads(output_files["Open Mills"].read_text())
            self.assertEqual(len(open_data["features"]), 1)
            self.assertIn("recycledpercent", open_data["features"][0]["properties"])
            self.assertNotIn("Recycled%", open_data["features"][0]["properties"])
