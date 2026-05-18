from unittest.mock import Mock, patch

from django.test import SimpleTestCase

from datasets.forisk_mills import (
    fetch_forisk_feature_collection,
    fetch_forisk_mill_collections,
    replace_forisk_mill_datalayer,
    split_forisk_mill_collections,
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

    def test_fetch_rejects_non_json_response(self):
        response = Mock()
        response.json.side_effect = ValueError("not json")
        response.raise_for_status.return_value = None
        session = Mock()
        session.get.return_value = response

        with self.assertRaisesMessage(ValueError, "Expected a JSON response"):
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

    def test_split_forisk_mill_collections_splits_and_normalizes_features(self):
        collections = split_forisk_mill_collections(
            feature_collection=self.feature_collection,
        )

        self.assertEqual(
            set(collections.keys()),
            {"Open Mills", "Closed Mills", "Announced Mills"},
        )
        open_data = collections["Open Mills"]
        self.assertEqual(len(open_data["features"]), 1)
        self.assertIn("recycledpercent", open_data["features"][0]["properties"])
        self.assertNotIn("Recycled%", open_data["features"][0]["properties"])

    @patch("datasets.forisk_mills.fetch_forisk_feature_collection")
    def test_fetch_forisk_mill_collections_fetches_and_splits(self, fetch_mock):
        fetch_mock.return_value = self.feature_collection

        collections = fetch_forisk_mill_collections(
            sub_key="subkey",
            user_key="userkey",
            api_url="https://example.test/forisk",
            timeout=10,
        )

        fetch_mock.assert_called_once_with(
            sub_key="subkey",
            user_key="userkey",
            api_url="https://example.test/forisk",
            timeout=10,
        )
        self.assertEqual(
            set(collections.keys()),
            {"Open Mills", "Closed Mills", "Announced Mills"},
        )

    @patch("datasets.tasks.datalayer_uploaded")
    @patch("datasets.forisk_mills.upload_geojson_to_storage")
    @patch("datasets.forisk_mills.geometry_from_info")
    @patch("datasets.forisk_mills.get_storage_url")
    @patch("datasets.forisk_mills.fetch_geometry_type")
    @patch("datasets.forisk_mills.detect_mimetype")
    @patch("datasets.forisk_mills.get_layer_info")
    @patch("datasets.forisk_mills.get_user_model")
    @patch("datasets.forisk_mills.DataLayer")
    def test_replace_forisk_mill_datalayer_deletes_and_recreates(
        self,
        datalayer_model_mock,
        get_user_model_mock,
        get_layer_info_mock,
        detect_mimetype_mock,
        fetch_geometry_type_mock,
        get_storage_url_mock,
        geometry_from_info_mock,
        upload_geojson_mock,
        datalayer_uploaded_mock,
    ):
        dataset = Mock(workspace=Mock())
        organization = Mock(pk=1)
        created_by = Mock()
        created_datalayer = Mock(pk=123)
        get_user_model_mock.return_value.objects.get.return_value = created_by
        get_layer_info_mock.return_value = ("VECTOR", {"layer": {"count": 1}})
        detect_mimetype_mock.return_value = "application/geo+json"
        fetch_geometry_type_mock.return_value = "POINT"
        get_storage_url_mock.return_value = "gs://bucket/open_mills.geojson"
        geometry = Mock()
        geometry_from_info_mock.return_value = geometry
        datalayer_model_mock.objects.create.return_value = created_datalayer
        feature_collection = {"type": "FeatureCollection", "features": []}

        result = replace_forisk_mill_datalayer(
            dataset=dataset,
            organization=organization,
            name="Open Mills",
            feature_collection=feature_collection,
        )

        datalayer_model_mock.objects.filter.assert_called_once_with(
            dataset=dataset,
            name="Open Mills",
        )
        datalayer_model_mock.objects.filter.return_value.update.assert_called_once()
        upload_geojson_mock.assert_called_once_with(
            storage_url="gs://bucket/open_mills.geojson",
            feature_collection=feature_collection,
        )
        datalayer_model_mock.objects.create.assert_called_once()
        create_kwargs = datalayer_model_mock.objects.create.call_args.kwargs
        self.assertTrue(create_kwargs.pop("uuid"))
        self.assertEqual(
            create_kwargs,
            {
                "name": "Open Mills",
                "dataset": dataset,
                "organization": organization,
                "workspace": dataset.workspace,
                "created_by": created_by,
                "original_name": "open_mills.geojson",
                "url": "gs://bucket/open_mills.geojson",
                "type": "VECTOR",
                "storage_type": "DATABASE",
                "geometry_type": "POINT",
                "geometry": geometry,
                "info": {"layer": {"count": 1}},
                "mimetype": "application/geo+json",
                "metadata": {},
                "map_service_type": "VECTORTILES",
                "status": "PENDING",
            },
        )
        datalayer_uploaded_mock.delay.assert_called_once_with(123, status="READY")
        self.assertEqual(result, created_datalayer)
