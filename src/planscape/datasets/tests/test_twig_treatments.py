import tempfile
from datetime import date
from unittest.mock import Mock, patch

from django.test import SimpleTestCase

from datasets.twig_treatments import (
    TWIG_TREATMENT_LAYER_NAMES,
    build_twig_where_clauses,
    fetch_twig_count,
    fetch_twig_feature_page,
    get_query_url,
    replace_twig_treatment_datalayer,
    slugify_layer_name,
    write_twig_feature_collection_to_file,
)


class TwigTreatmentsTest(SimpleTestCase):
    def setUp(self):
        self.feature_collection = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {
                        "objectid": 1,
                        "name": "Example Treatment",
                        "treatment_date": 1751241600000,
                        "status": "Completed",
                    },
                    "geometry": {
                        "type": "MultiPolygon",
                        "coordinates": [],
                    },
                }
            ],
        }

    def test_get_query_url_accepts_layer_url(self):
        self.assertEqual(
            get_query_url("https://example.test/FeatureServer/0"),
            "https://example.test/FeatureServer/0/query",
        )

    def test_get_query_url_accepts_query_url(self):
        self.assertEqual(
            get_query_url("https://example.test/FeatureServer/0/query"),
            "https://example.test/FeatureServer/0/query",
        )

    def test_slugify_layer_name(self):
        self.assertEqual(
            slugify_layer_name("TWIG - Years Since Treatment: 06-10"),
            "twig_years_since_treatment_06_10",
        )

    def test_build_twig_where_clauses_uses_dynamic_cutoffs(self):
        where_clauses = build_twig_where_clauses(today=date(2026, 6, 1))

        self.assertEqual(
            where_clauses[TWIG_TREATMENT_LAYER_NAMES["0-5"]],
            "treatment_date >= TIMESTAMP '2021-06-01 00:00:00'",
        )
        self.assertEqual(
            where_clauses[TWIG_TREATMENT_LAYER_NAMES["06-10"]],
            "treatment_date >= TIMESTAMP '2016-06-01 00:00:00' "
            "AND treatment_date < TIMESTAMP '2021-06-01 00:00:00'",
        )
        self.assertEqual(
            where_clauses[TWIG_TREATMENT_LAYER_NAMES["11-15"]],
            "treatment_date >= TIMESTAMP '2011-06-01 00:00:00' "
            "AND treatment_date < TIMESTAMP '2016-06-01 00:00:00'",
        )

    def test_build_twig_where_clauses_can_add_status_filter(self):
        where_clauses = build_twig_where_clauses(
            today=date(2026, 6, 1),
            status_filter="Completed",
        )

        self.assertIn(
            "status = 'Completed'",
            where_clauses[TWIG_TREATMENT_LAYER_NAMES["0-5"]],
        )

    def test_fetch_twig_count_returns_count(self):
        response = Mock()
        response.json.return_value = {"count": 123}
        response.raise_for_status.return_value = None

        session = Mock()
        session.get.return_value = response

        count = fetch_twig_count(
            api_url="https://example.test/FeatureServer/0",
            where_clause="1=1",
            session=session,
        )

        self.assertEqual(count, 123)
        request_kwargs = session.get.call_args.kwargs
        self.assertEqual(request_kwargs["params"]["returnCountOnly"], "true")
        self.assertEqual(request_kwargs["params"]["where"], "1=1")

    def test_fetch_twig_count_rejects_missing_count(self):
        response = Mock()
        response.json.return_value = {"foo": "bar"}
        response.raise_for_status.return_value = None

        session = Mock()
        session.get.return_value = response

        with self.assertRaises(ValueError):
            fetch_twig_count(
                api_url="https://example.test/FeatureServer/0",
                where_clause="1=1",
                session=session,
            )

    def test_fetch_twig_feature_page_rejects_non_feature_collection(self):
        response = Mock()
        response.json.return_value = {"foo": "bar"}
        response.raise_for_status.return_value = None

        session = Mock()
        session.get.return_value = response

        with self.assertRaises(ValueError):
            fetch_twig_feature_page(
                api_url="https://example.test/FeatureServer/0",
                where_clause="1=1",
                result_offset=0,
                result_record_count=1000,
                session=session,
            )

    def test_fetch_twig_feature_page_passes_pagination_params(self):
        response = Mock()
        response.json.return_value = self.feature_collection
        response.raise_for_status.return_value = None

        session = Mock()
        session.get.return_value = response

        fetch_twig_feature_page(
            api_url="https://example.test/FeatureServer/0",
            where_clause="1=1",
            result_offset=1000,
            result_record_count=1000,
            session=session,
        )

        request_kwargs = session.get.call_args.kwargs
        self.assertEqual(request_kwargs["params"]["f"], "geojson")
        self.assertEqual(request_kwargs["params"]["resultOffset"], 1000)
        self.assertEqual(request_kwargs["params"]["resultRecordCount"], 1000)
        self.assertEqual(request_kwargs["params"]["orderByFields"], "objectid ASC")

    @patch("datasets.twig_treatments.fetch_twig_feature_page")
    @patch("datasets.twig_treatments.fetch_twig_count")
    def test_write_twig_feature_collection_to_file_paginates(
        self,
        count_mock,
        page_mock,
    ):
        count_mock.return_value = 2
        page_mock.side_effect = [
            {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "properties": {
                            "objectid": 1,
                            "treatment_date": 1751241600000,
                        },
                    },
                ],
            },
            {
                "type": "FeatureCollection",
                "features": [
                    {"type": "Feature", "properties": {"objectid": 2}},
                ],
            },
        ]
        with tempfile.NamedTemporaryFile(mode="w+", encoding="utf-8") as temp_file:
            count = write_twig_feature_collection_to_file(
                api_url="https://example.test/FeatureServer/0",
                where_clause="1=1",
                output_file=temp_file,
                page_size=1,
            )
            temp_file.seek(0)
            output = temp_file.read()

        self.assertEqual(count, 2)
        self.assertEqual(page_mock.call_count, 2)
        self.assertIn('"FeatureCollection"', output)
        self.assertIn('"objectid":1', output)
        self.assertIn('"objectid":2', output)
        self.assertIn('"treatment_date":"2025-06-30"', output)

    @patch("datasets.tasks.datalayer_uploaded")
    @patch("datasets.twig_treatments.upload_twig_file_to_storage")
    @patch("datasets.twig_treatments.convert_geojson_to_zipped_shapefile")
    @patch("datasets.twig_treatments.geometry_from_info")
    @patch("datasets.twig_treatments.get_storage_url")
    @patch("datasets.twig_treatments.fetch_geometry_type")
    @patch("datasets.twig_treatments.get_layer_info")
    @patch("datasets.twig_treatments.get_user_model")
    @patch("datasets.twig_treatments.DataLayerHasStyle")
    @patch("datasets.twig_treatments.DataLayer")
    def test_replace_twig_treatment_datalayer_soft_deletes_and_recreates(
        self,
        datalayer_model_mock,
        datalayer_has_style_mock,
        get_user_model_mock,
        get_layer_info_mock,
        fetch_geometry_type_mock,
        get_storage_url_mock,
        geometry_from_info_mock,
        convert_geojson_to_zipped_shapefile_mock,
        upload_twig_file_mock,
        datalayer_uploaded_mock,
    ):
        dataset = Mock(workspace=Mock())
        organization = Mock(pk=1)
        created_by = Mock()
        created_datalayer = Mock(pk=123)

        get_user_model_mock.return_value.objects.get.return_value = created_by
        convert_geojson_to_zipped_shapefile_mock.return_value = (
            "/tmp/twig_years_since_treatment_0_5.zip",
            "/tmp/twig_years_since_treatment_0_5.shp",
        )
        get_layer_info_mock.return_value = ("VECTOR", {"layer": {"count": 1}})
        fetch_geometry_type_mock.return_value = "MULTIPOLYGON"
        get_storage_url_mock.return_value = (
            "gs://bucket/twig_years_since_treatment_0_5.zip"
        )
        geometry = Mock()
        geometry_from_info_mock.return_value = geometry
        datalayer_model_mock.objects.create.return_value = created_datalayer

        existing_layer = Mock(pk=5)
        existing_layer.name = "TWIG - Years Since Treatment: 0-5"
        existing_layer.deleted_at = None

        existing_layers = datalayer_model_mock.dead_or_alive.filter.return_value

        existing_layer = Mock()
        existing_layer.pk = 456
        existing_layer.name = "TWIG - Years Since Treatment: 0-5"
        existing_layer.metadata = {}
        existing_layer.category = None
        existing_layer.rel_styles.all.return_value = []

        existing_layers.filter.return_value.first.return_value = existing_layer
        existing_layers.__iter__.return_value = iter([existing_layer])

        result = replace_twig_treatment_datalayer(
            dataset=dataset,
            organization=organization,
            name="TWIG - Years Since Treatment: 0-5",
            input_file="/tmp/twig.geojson",
        )

        datalayer_model_mock.dead_or_alive.filter.assert_called_once_with(
            dataset=dataset,
            name="TWIG - Years Since Treatment: 0-5",
        )
        existing_layers.filter.assert_called_once_with(deleted_at=None)
        self.assertEqual(
            existing_layer.name,
            "TWIG - Years Since Treatment: 0-5 (replaced 456)",
        )
        self.assertIsNotNone(existing_layer.deleted_at)
        existing_layer.save.assert_called_once_with(
            update_fields=["name", "deleted_at"]
        )
        self.assertIsNotNone(existing_layer.deleted_at)

        convert_geojson_to_zipped_shapefile_mock.assert_called_once()
        self.assertEqual(
            convert_geojson_to_zipped_shapefile_mock.call_args.kwargs["input_file"],
            "/tmp/twig.geojson",
        )
        self.assertEqual(
            convert_geojson_to_zipped_shapefile_mock.call_args.kwargs["layer_name"],
            "TWIG - Years Since Treatment: 0-5",
        )

        get_layer_info_mock.assert_called_once_with(
            input_file="/tmp/twig_years_since_treatment_0_5.shp",
        )

        upload_twig_file_mock.assert_called_once_with(
            storage_url="gs://bucket/twig_years_since_treatment_0_5.zip",
            input_file="/tmp/twig_years_since_treatment_0_5.zip",
        )

        datalayer_model_mock.objects.create.assert_called_once()
        create_kwargs = datalayer_model_mock.objects.create.call_args.kwargs

        self.assertEqual(create_kwargs["name"], "TWIG - Years Since Treatment: 0-5")
        self.assertEqual(
            create_kwargs["original_name"],
            "twig_years_since_treatment_0_5.zip",
        )
        self.assertEqual(
            create_kwargs["url"],
            "gs://bucket/twig_years_since_treatment_0_5.zip",
        )
        self.assertEqual(create_kwargs["mimetype"], "application/zip")
        self.assertEqual(create_kwargs["map_service_type"], "VECTORTILES")
        self.assertEqual(create_kwargs["status"], "PENDING")
        self.assertIsNone(create_kwargs["category"])

        datalayer_has_style_mock.objects.bulk_create.assert_called_once_with([])
        datalayer_uploaded_mock.delay.assert_called_once_with(123, status="READY")
        self.assertEqual(result, created_datalayer)

    @patch("datasets.tasks.datalayer_uploaded")
    @patch("datasets.twig_treatments.upload_twig_file_to_storage")
    @patch("datasets.twig_treatments.convert_geojson_to_zipped_shapefile")
    @patch("datasets.twig_treatments.geometry_from_info")
    @patch("datasets.twig_treatments.get_storage_url")
    @patch("datasets.twig_treatments.fetch_geometry_type")
    @patch("datasets.twig_treatments.get_layer_info")
    @patch("datasets.twig_treatments.get_user_model")
    @patch("datasets.twig_treatments.DataLayerHasStyle")
    @patch("datasets.twig_treatments.DataLayer")
    def test_replace_twig_treatment_datalayer_preserves_metadata_category_and_styles(
        self,
        datalayer_model_mock,
        datalayer_has_style_mock,
        get_user_model_mock,
        get_layer_info_mock,
        fetch_geometry_type_mock,
        get_storage_url_mock,
        geometry_from_info_mock,
        convert_geojson_to_zipped_shapefile_mock,
        upload_twig_file_mock,
        datalayer_uploaded_mock,
    ):
        dataset = Mock(workspace=Mock())
        organization = Mock(pk=1)
        category = Mock()
        created_by = Mock()
        created_datalayer = Mock(pk=123)

        existing_datalayer = Mock(
            metadata={"modules": {"twig": {"enabled": True}}},
            category=category,
        )
        first_association = Mock(style_id=11, default=True)
        second_association = Mock(style_id=22, default=False)
        existing_datalayer.rel_styles.all.return_value = [
            first_association,
            second_association,
        ]

        get_user_model_mock.return_value.objects.get.return_value = created_by
        convert_geojson_to_zipped_shapefile_mock.return_value = (
            "/tmp/twig_years_since_treatment_0_5.zip",
            "/tmp/twig_years_since_treatment_0_5.shp",
        )
        get_layer_info_mock.return_value = ("VECTOR", {"layer": {"count": 1}})
        fetch_geometry_type_mock.return_value = "MULTIPOLYGON"
        get_storage_url_mock.return_value = (
            "gs://bucket/twig_years_since_treatment_0_5.zip"
        )
        geometry_from_info_mock.return_value = Mock()
        datalayer_model_mock.objects.create.return_value = created_datalayer

        existing_layers = datalayer_model_mock.dead_or_alive.filter.return_value
        existing_layers.filter.return_value.first.return_value = existing_datalayer

        replace_twig_treatment_datalayer(
            dataset=dataset,
            organization=organization,
            name="TWIG - Years Since Treatment: 0-5",
            input_file="/tmp/twig.geojson",
        )

        create_kwargs = datalayer_model_mock.objects.create.call_args.kwargs

        self.assertEqual(
            create_kwargs["metadata"]["modules"]["twig"], {"enabled": True}
        )
        self.assertEqual(create_kwargs["category"], category)

        datalayer_has_style_mock.objects.bulk_create.assert_called_once()
        style_rows = datalayer_has_style_mock.objects.bulk_create.call_args.args[0]
        self.assertEqual(len(style_rows), 2)

        datalayer_has_style_mock.assert_any_call(
            datalayer=created_datalayer,
            style_id=11,
            default=True,
        )
        datalayer_has_style_mock.assert_any_call(
            datalayer=created_datalayer,
            style_id=22,
            default=False,
        )

        upload_twig_file_mock.assert_called_once_with(
            storage_url="gs://bucket/twig_years_since_treatment_0_5.zip",
            input_file="/tmp/twig_years_since_treatment_0_5.zip",
        )
