import json
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch

from django.test import SimpleTestCase, override_settings

from datasets.forisk_mills import (
    fetch_forisk_feature_collection,
    refresh_forisk_mill_files,
    write_forisk_mill_files,
)
from datasets.management.commands.datalayers import Command


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

    @patch("datasets.forisk_mills.fetch_forisk_feature_collection")
    def test_refresh_forisk_mill_files_fetches_and_writes_files(self, fetch_mock):
        fetch_mock.return_value = self.feature_collection

        with tempfile.TemporaryDirectory() as tmpdir:
            output_files = refresh_forisk_mill_files(
                sub_key="subkey",
                user_key="userkey",
                api_url="https://example.test/forisk",
                output_dir=Path(tmpdir),
                timeout=10,
            )

        fetch_mock.assert_called_once_with(
            sub_key="subkey",
            user_key="userkey",
            api_url="https://example.test/forisk",
            timeout=10,
        )
        self.assertEqual(
            set(output_files.keys()),
            {"Open Mills", "Closed Mills", "Announced Mills"},
        )

    @override_settings(
        FORISK_MILLS_DATASET_NAME="Forisk Mills",
        FORISK_MILLS_SUB_KEY="subkey",
        FORISK_MILLS_USER_KEY="userkey",
        FORISK_MILLS_API_URL="https://example.test/forisk",
        FORISK_MILLS_TIMEOUT=10,
        BACKUPS_PATH="/tmp",
    )
    @patch("datasets.management.commands.datalayers.Dataset")
    @patch("datasets.management.commands.datalayers.DataLayer")
    @patch("datasets.forisk_mills.refresh_forisk_mill_files")
    def test_datalayers_command_refreshes_forisk_files_as_datalayers(
        self,
        refresh_files_mock,
        datalayer_mock,
        dataset_mock,
    ):
        refresh_files_mock.return_value = {
            "Open Mills": Path("/tmp/open_mills.geojson"),
            "Closed Mills": Path("/tmp/closed_mills.geojson"),
        }
        dataset_mock.objects.get.return_value = Mock(id=1061)
        command = Command()
        command._create_datalayer = Mock(return_value={"ok": True})

        command.refresh_forisk_mills(
            token="token",
            org=1,
            env="catalog",
        )

        dataset_mock.objects.get.assert_called_once_with(
            name="Forisk Mills",
            organization_id=1,
        )
        refresh_files_mock.assert_called_once_with(
            sub_key="subkey",
            user_key="userkey",
            api_url="https://example.test/forisk",
            output_dir=Path("/tmp/forisk_mills"),
            timeout=10,
        )
        self.assertEqual(datalayer_mock.objects.filter.call_count, 2)
        command._create_datalayer.assert_any_call(
            name="Open Mills",
            dataset=1061,
            input_file="/tmp/open_mills.geojson",
            skip_existing=False,
            map_service_type="VECTORTILES",
            token="token",
            org=1,
            env="catalog",
        )
