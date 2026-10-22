from unittest import mock
from uuid import uuid4

from django.conf import settings
from django.contrib.gis.geos import GEOSGeometry, MultiPolygon
from django.db import connection
from django.test import TestCase, override_settings
from organizations.tests.factories import OrganizationFactory
from planscape.tests.factories import UserFactory

from datasets.models import (
    Category,
    DataLayer,
    DataLayerStatus,
    DataLayerType,
    Dataset,
    GeometryType,
    PreferredDisplayType,
    SearchTab,
    SelectionTypeOptions,
    VisibilityOptions,
    WorkspaceFavoriteDataLayer,
)
from datasets.services import (
    create_dataset,
    create_datalayer,
    create_upload_url_for_org,
    find_anything,
    get_bucket_url,
    get_object_name,
    get_storage_url,
    get_table_mask,
)
from datasets.tests.factories import (
    DataLayerFactory,
    DatasetFactory,
    SimpleCategoryFactory,
)
from workspaces.tests.factories import PlanningWorkspaceFactory, WorkspaceFactory


class TestCreateDataset(TestCase):
    def setUp(self):
        self.organization = OrganizationFactory.create()
        self.user = self.organization.created_by
        self.workspace = WorkspaceFactory.create()

    def _create(self, **kwargs):
        return create_dataset(
            name="Test Dataset",
            organization=self.organization,
            workspace=self.workspace,
            created_by=self.user,
            **kwargs,
        )

    def test_creates_dataset(self):
        dataset = self._create()
        self.assertIsInstance(dataset, Dataset)
        self.assertEqual(Dataset.objects.filter(pk=dataset.pk).count(), 1)

    def test_persists_name_and_organization(self):
        dataset = self._create()
        self.assertEqual(dataset.name, "Test Dataset")
        self.assertEqual(dataset.organization, self.organization)
        self.assertEqual(dataset.created_by, self.user)

    def test_persists_selection_type(self):
        dataset = self._create(selection_type=SelectionTypeOptions.SINGLE)
        dataset.refresh_from_db()
        self.assertEqual(dataset.selection_type, SelectionTypeOptions.SINGLE)

    def test_persists_preferred_display_type(self):
        dataset = self._create(
            preferred_display_type=PreferredDisplayType.MAIN_DATALAYERS
        )
        dataset.refresh_from_db()
        self.assertEqual(
            dataset.preferred_display_type, PreferredDisplayType.MAIN_DATALAYERS
        )

    def test_selection_type_defaults_to_none(self):
        dataset = self._create()
        self.assertIsNone(dataset.selection_type)

    def test_preferred_display_type_defaults_to_none(self):
        dataset = self._create()
        self.assertIsNone(dataset.preferred_display_type)

    def test_default_visibility_is_public(self):
        dataset = self._create()
        self.assertEqual(dataset.visibility, VisibilityOptions.PUBLIC)


class TestGetObjectName(TestCase):
    def test_get_object_name_returns_valid_str_with_both_prevails_pdf(self):
        org_id = 1
        uuid = str(uuid4())
        name = get_object_name(org_id, uuid, "foo.pdf", "application/msword")
        self.assertIsNotNone(name)
        self.assertEqual(name, f"datalayers/1/{uuid}.pdf")

    def test_get_object_name_returns_valid_str_just_original_name(self):
        org_id = 1
        uuid = str(uuid4())
        name = get_object_name(org_id, uuid, "foo.pdf")
        self.assertIsNotNone(name)
        self.assertEqual(name, f"datalayers/1/{uuid}.pdf")

    def test_get_object_name_returns_valid_str_mime_original_name(self):
        org_id = 1
        uuid = str(uuid4())
        name = get_object_name(org_id, uuid, None, "application/pdf")
        self.assertIsNotNone(name)
        self.assertEqual(name, f"datalayers/1/{uuid}.pdf")

    def test_get_object_name_returns_valid_str_no_name_no_mime(self):
        org_id = 1
        uuid = str(uuid4())
        name = get_object_name(org_id, uuid)
        self.assertIsNotNone(name)
        self.assertEqual(name, f"datalayers/1/{uuid}")


class TestCreateUploadURLForOrganization(TestCase):
    @override_settings(PROVIDER="aws")
    @mock.patch(
        "datasets.services.create_upload_url_s3",
        return_value={"url": "foo.pdf"},
    )
    def test_call_create_url_on_s3_returns_url_with_both(self, create_upload_url_mock):
        uuid = str(uuid4())
        result = create_upload_url_for_org(1, uuid, "foo.pdf", "application/pdf")
        self.assertEqual(result, {"url": "foo.pdf"})
        create_upload_url_mock.assert_called_with(
            bucket_name=settings.S3_BUCKET,
            object_name=f"{settings.DATALAYERS_FOLDER}/1/{uuid}.pdf",
            expiration=settings.UPLOAD_EXPIRATION_TTL,
        )

    @override_settings(PROVIDER="gcp")
    @mock.patch(
        "datasets.services.create_upload_url_gcs",
        return_value={"url": "foo.pdf"},
    )
    def test_call_create_url_on_gcs_returns_url_with_both(self, create_upload_url_mock):
        uuid = str(uuid4())
        result = create_upload_url_for_org(1, uuid, "foo.pdf", "application/pdf")
        self.assertEqual(result, {"url": "foo.pdf"})
        create_upload_url_mock.assert_called_with(
            object_name=f"{settings.DATALAYERS_FOLDER}/1/{uuid}.pdf"
        )


class TestCreateDataLayer(TestCase):
    def setUp(self):
        DataLayer.objects.all().delete()  # Delete hard coded datalayers

    @override_settings(PROVIDER="aws")
    @mock.patch(
        "datasets.services.create_upload_url_s3",
        return_value={"url": "foo"},
    )
    def test_create_datalayer_returns_url_and_datalayer_S3(
        self, create_upload_url_mock
    ):
        dataset = DatasetFactory()
        result = create_datalayer(
            name="my datalayer",
            dataset=dataset,
            organization=dataset.organization,
            created_by=dataset.created_by,
            original_name="foo.tif",
        )
        self.assertIn("datalayer", result)
        self.assertIsNotNone(result["datalayer"])
        self.assertIn("upload_to", result)
        self.assertIsNotNone(result["upload_to"])
        self.assertEqual(1, DataLayer.objects.all().count())

    @override_settings(PROVIDER="aws")
    @mock.patch(
        "datasets.services.create_upload_url_s3", side_effect=ValueError("boom")
    )
    def test_create_datalayer_exception_does_not_create_datalayer_S3(
        self, create_upload_url_mock
    ):
        dataset = DatasetFactory()
        with self.assertRaises(ValueError):
            create_datalayer(
                name="my datalayer",
                dataset=dataset,
                organization=dataset.organization,
                created_by=dataset.created_by,
                original_name="foo.tif",
            )
            self.assertEqual(0, DataLayer.objects.all().count())

    @override_settings(PROVIDER="gcp")
    @mock.patch(
        "datasets.services.create_upload_url_gcs",
        return_value={"url": "foo"},
    )
    def test_create_datalayer_returns_url_and_datalayer_GCS(
        self, create_upload_url_mock
    ):
        dataset = DatasetFactory()
        result = create_datalayer(
            name="my datalayer",
            dataset=dataset,
            organization=dataset.organization,
            created_by=dataset.created_by,
            original_name="foo.tif",
        )
        self.assertIn("datalayer", result)
        self.assertIsNotNone(result["datalayer"])
        self.assertIn("upload_to", result)
        self.assertIsNotNone(result["upload_to"])
        self.assertEqual(1, DataLayer.objects.all().count())

    @override_settings(PROVIDER="gcp")
    @mock.patch(
        "datasets.services.create_upload_url_gcs", side_effect=ValueError("boom")
    )
    def test_create_datalayer_exception_does_not_create_datalayer_GCS(
        self, create_upload_url_mock
    ):
        dataset = DatasetFactory()
        with self.assertRaises(ValueError):
            create_datalayer(
                name="my datalayer",
                dataset=dataset,
                organization=dataset.organization,
                created_by=dataset.created_by,
                original_name="foo.tif",
            )
            self.assertEqual(0, DataLayer.objects.all().count())


class TestGetTableMask(TestCase):
    def create_datastore_table(self, geometry_type, geometries):
        table_name = f"test_table_mask_{uuid4().hex}"
        with connection.cursor() as cursor:
            cursor.execute(
                f"""
                CREATE TABLE datastore.{table_name} (
                    id serial PRIMARY KEY,
                    geometry geometry({geometry_type}, 4269)
                );
                """
            )
            for geometry in geometries:
                cursor.execute(
                    f"""
                    INSERT INTO datastore.{table_name} (geometry)
                    VALUES (ST_GeomFromText(%s, 4269));
                    """,
                    [geometry],
                )
        self.addCleanup(self.drop_datastore_table, table_name)
        return f"datastore.{table_name}"

    def drop_datastore_table(self, table_name):
        with connection.cursor() as cursor:
            cursor.execute(f"DROP TABLE IF EXISTS datastore.{table_name};")

    def test_get_table_mask_returns_envelope_union_for_polygon_layer(self):
        table = self.create_datastore_table(
            "Polygon",
            [
                "POLYGON ((0 0, 1 0, 1 1, 0 1, 0 0))",
                "POLYGON ((2 2, 3 2, 3 3, 2 3, 2 2))",
            ],
        )
        datalayer = DataLayerFactory(
            table=table,
            type=DataLayerType.VECTOR,
            geometry_type=GeometryType.POLYGON,
        )

        result = get_table_mask(datalayer)

        self.assertIsNotNone(result)
        self.assertEqual(result.geom_type, "MultiPolygon")

    def test_get_table_mask_returns_convex_hull_for_point_layer(self):
        table = self.create_datastore_table(
            "Point",
            [
                "POINT (0 0)",
                "POINT (1 0)",
                "POINT (0 1)",
            ],
        )
        datalayer = DataLayerFactory(
            table=table,
            type=DataLayerType.VECTOR,
            geometry_type=GeometryType.POINT,
        )

        result = get_table_mask(datalayer)

        self.assertIsNotNone(result)
        self.assertEqual(result.geom_type, "MultiPolygon")

    def test_get_table_mask_returns_none_for_non_polygonal_point_hull(self):
        table = self.create_datastore_table(
            "Point",
            [
                "POINT (0 0)",
                "POINT (1 1)",
            ],
        )
        datalayer = DataLayerFactory(
            table=table,
            type=DataLayerType.VECTOR,
            geometry_type=GeometryType.POINT,
        )

        result = get_table_mask(datalayer)

        self.assertIsNone(result)


class TestSearch(TestCase):
    def test_end_to_end_with_spatial(self):
        unit_square = MultiPolygon(
            GEOSGeometry(
                "POLYGON ((0 0, 1 0, 1 1, 0 1, 0 0))",
                srid=4269,
            )
        )
        unit_square_east_5 = MultiPolygon(
            GEOSGeometry(
                "POLYGON ((5 0, 6 0, 6 1, 5 1, 5 0))",
                srid=4269,
            )
        )
        organization = OrganizationFactory.create(name="my cool fire org")
        dataset = DatasetFactory(
            organization=organization,
            name="my awesome fire dataset",
            visibility="PUBLIC",
        )
        category1 = Category.add_root(
            created_by=organization.created_by,
            dataset=dataset,
            organization=organization,
            name="the fire art pieces",
        )
        subcategory1 = category1.add_child(
            created_by=organization.created_by,
            dataset=dataset,
            organization=organization,
            name="the fire music albums",
        )
        category2 = Category.add_root(
            created_by=organization.created_by,
            dataset=dataset,
            organization=organization,
            name="no matches",
        )
        subcategory2 = category2.add_child(
            created_by=organization.created_by,
            dataset=dataset,
            organization=organization,
            name="also no matches",
        )
        # should be returned
        cat1_datalayer1 = DataLayerFactory.create(
            organization=organization,
            dataset=dataset,
            name="A lighthouse on fire at night",
            category=category1,
            status=DataLayerStatus.READY,
            type=DataLayerType.RASTER,
            outline=unit_square,
        )
        cat1_datalayer2 = DataLayerFactory.create(
            organization=organization,
            dataset=dataset,
            name="Cassandra",
            category=category1,
            status=DataLayerStatus.READY,
            type=DataLayerType.RASTER,
            outline=unit_square,
        )
        # should NOT BE RETURNED BECAUSE SPATIAL
        cat1_datalayer3 = DataLayerFactory.create(
            organization=organization,
            dataset=dataset,
            name="BAD GEOM",
            category=category1,
            status=DataLayerStatus.READY,
            type=DataLayerType.RASTER,
            outline=unit_square_east_5,
        )
        results = find_anything(
            "fire",
            type=DataLayerType.RASTER,
            geometry=unit_square,
        )
        names = [r.name for r in results.values()]
        # in
        self.assertIn(dataset.name, names)
        self.assertIn(cat1_datalayer1.name, names)
        self.assertIn(cat1_datalayer2.name, names)
        # out
        # categories will never be diretcly included
        self.assertNotIn(category1.name, names)
        self.assertNotIn(subcategory1.name, names)
        # these just don't match
        self.assertNotIn(category2.name, names)
        self.assertNotIn(subcategory2.name, names)
        self.assertNotIn(cat1_datalayer3.name, names)

    def test_end_to_end(self):
        organization = OrganizationFactory.create(name="my cool fire org")
        dataset = DatasetFactory(
            organization=organization,
            name="my awesome fire dataset",
            visibility="PUBLIC",
        )
        category1 = Category.add_root(
            created_by=organization.created_by,
            dataset=dataset,
            organization=organization,
            name="the fire art pieces",
        )
        subcategory1 = category1.add_child(
            created_by=organization.created_by,
            dataset=dataset,
            organization=organization,
            name="the fire music albums",
        )
        category2 = Category.add_root(
            created_by=organization.created_by,
            dataset=dataset,
            organization=organization,
            name="no matches",
        )
        subcategory2 = category2.add_child(
            created_by=organization.created_by,
            dataset=dataset,
            organization=organization,
            name="also no matches",
        )
        # should be returned
        cat1_datalayer1 = DataLayerFactory.create(
            organization=organization,
            dataset=dataset,
            name="A lighthouse on fire at night",
            category=category1,
            status=DataLayerStatus.READY,
            type=DataLayerType.RASTER,
        )
        # should be returned too
        cat1_datalayer2 = DataLayerFactory.create(
            organization=organization,
            dataset=dataset,
            name="Cassandra",
            category=category1,
            status=DataLayerStatus.READY,
            type=DataLayerType.RASTER,
        )

        # should be returned
        subcat1_datalayer1 = DataLayerFactory.create(
            organization=organization,
            dataset=dataset,
            name="Play with Fire",
            category=subcategory1,
            status=DataLayerStatus.READY,
            type=DataLayerType.RASTER,
        )
        # should be returned too, because it's inside category
        subcat1_datalayer2 = DataLayerFactory.create(
            organization=organization,
            dataset=dataset,
            name="Ride the Lightning",
            category=subcategory1,
            status=DataLayerStatus.READY,
            type=DataLayerType.RASTER,
        )

        # SHOULD NOT MATCH
        cat2_datalayer1 = DataLayerFactory.create(
            organization=organization,
            dataset=dataset,
            name="foobarbaz",
            category=category2,
            status=DataLayerStatus.READY,
        )
        cat2_datalayer2 = DataLayerFactory.create(
            organization=organization,
            dataset=dataset,
            name="do not match layer",
            category=subcategory2,
            status=DataLayerStatus.READY,
        )

        results = find_anything(
            "fire",
            type=DataLayerType.RASTER,
        )
        names = [r.name for r in results.values()]
        # in
        self.assertIn(dataset.name, names)
        self.assertIn(cat1_datalayer1.name, names)
        self.assertIn(cat1_datalayer2.name, names)
        self.assertIn(subcat1_datalayer1.name, names)
        self.assertIn(subcat1_datalayer2.name, names)
        # out
        # categories will never be diretcly included
        self.assertNotIn(category1.name, names)
        self.assertNotIn(subcategory1.name, names)
        # these just don't match
        self.assertNotIn(category2.name, names)
        self.assertNotIn(subcategory2.name, names)
        self.assertNotIn(cat2_datalayer1.name, names)
        self.assertNotIn(cat2_datalayer2.name, names)

    @override_settings(FEATURE_FLAGS=["DATA_ORGANIZATION"])
    def test_simple_category_name_returns_datalayers(self):
        dataset = DatasetFactory(visibility="PUBLIC")
        wildlife = SimpleCategoryFactory.create(name="Wildlife Habitat")
        other = SimpleCategoryFactory.create(name="Roads")
        habitat_layer = DataLayerFactory.create(
            dataset=dataset,
            name="Spotted owl",
            status=DataLayerStatus.READY,
            type=DataLayerType.RASTER,
            simple_categories=[wildlife, other],
        )
        vector_layer = DataLayerFactory.create(
            dataset=dataset,
            name="Owl nests",
            status=DataLayerStatus.READY,
            type=DataLayerType.VECTOR,
            simple_categories=[wildlife],
        )
        roads_layer = DataLayerFactory.create(
            dataset=dataset,
            name="Highways",
            status=DataLayerStatus.READY,
            type=DataLayerType.RASTER,
            simple_categories=[other],
        )

        results = find_anything("habitat", type=DataLayerType.RASTER)

        names = [r.name for r in results.values()]
        self.assertEqual(names.count(habitat_layer.name), 1)
        self.assertNotIn(vector_layer.name, names)
        self.assertNotIn(roads_layer.name, names)
        # its layers are already listed, so the category isn't
        self.assertNotIn(f"SIMPLE_CATEGORY:{wildlife.pk}", results)

    @override_settings(FEATURE_FLAGS=["DATA_ORGANIZATION"])
    def test_simple_category_is_dropped_when_its_datalayers_are_returned(self):
        dataset = DatasetFactory(visibility="PUBLIC")
        forest = SimpleCategoryFactory.create(name="Conifers")
        canopy = DataLayerFactory.create(
            dataset=dataset,
            name="Canopy cover",
            status=DataLayerStatus.READY,
            type=DataLayerType.RASTER,
            simple_categories=[forest],
        )
        height = DataLayerFactory.create(
            dataset=dataset,
            name="Tree height",
            status=DataLayerStatus.READY,
            type=DataLayerType.RASTER,
            simple_categories=[forest],
        )

        results = find_anything("conifer", type=DataLayerType.RASTER)

        self.assertEqual(
            set(results),
            {f"DATALAYER:{canopy.pk}", f"DATALAYER:{height.pk}"},
        )

    @override_settings(FEATURE_FLAGS=[])
    def test_simple_categories_are_not_searched_without_flag(self):
        dataset = DatasetFactory(visibility="PUBLIC")
        category = SimpleCategoryFactory.create(name="Ponderosa forests")
        DataLayerFactory.create(
            dataset=dataset,
            name="Tree height",
            status=DataLayerStatus.READY,
            type=DataLayerType.RASTER,
            simple_categories=[category],
        )

        results = find_anything("ponderosa", type=DataLayerType.RASTER)

        self.assertEqual(results, {})

    @override_settings(FEATURE_FLAGS=["DATA_ORGANIZATION"])
    def test_simple_category_without_matching_datalayers_is_not_returned(self):
        dataset = DatasetFactory(visibility="PUBLIC")
        vector_only = SimpleCategoryFactory.create(name="Tamarisk stands")
        SimpleCategoryFactory.create(name="Tamarisk removal")
        DataLayerFactory.create(
            dataset=dataset,
            name="Stands",
            status=DataLayerStatus.READY,
            type=DataLayerType.VECTOR,
            simple_categories=[vector_only],
        )

        results = find_anything("tamarisk", type=DataLayerType.RASTER)

        self.assertEqual(results, {})

    def test_metadata_values_return_datalayers(self):
        dataset = DatasetFactory(visibility="PUBLIC")
        abstract_layer = DataLayerFactory.create(
            dataset=dataset,
            name="Layer A",
            status=DataLayerStatus.READY,
            type=DataLayerType.RASTER,
            metadata={
                "identification": {
                    "title": "Layer A",
                    "abstract": "Modeled sagebrush cover",
                }
            },
        )
        keyword_layer = DataLayerFactory.create(
            dataset=dataset,
            name="Layer B",
            status=DataLayerStatus.READY,
            type=DataLayerType.RASTER,
            metadata={
                "identification": {
                    "keywords": {"default": {"keywords": ["fuels", "SAGEBRUSH"]}}
                }
            },
        )
        no_match_layer = DataLayerFactory.create(
            dataset=dataset,
            name="Layer C",
            status=DataLayerStatus.READY,
            type=DataLayerType.RASTER,
            metadata={"identification": {"abstract": "Canopy height"}},
        )
        null_metadata_layer = DataLayerFactory.create(
            dataset=dataset,
            name="Layer D",
            status=DataLayerStatus.READY,
            type=DataLayerType.RASTER,
            metadata=None,
        )

        results = find_anything("sagebrush", type=DataLayerType.RASTER)

        names = [r.name for r in results.values()]
        self.assertIn(abstract_layer.name, names)
        self.assertIn(keyword_layer.name, names)
        self.assertNotIn(no_match_layer.name, names)
        self.assertNotIn(null_metadata_layer.name, names)

    def test_metadata_search_ignores_keys_and_modules(self):
        dataset = DatasetFactory(visibility="PUBLIC")
        DataLayerFactory.create(
            dataset=dataset,
            name="Layer A",
            status=DataLayerStatus.READY,
            type=DataLayerType.RASTER,
            metadata={
                "identification": {"abstract": "Canopy height"},
                "modules": {"map": {"enabled": True, "label": "pinyon"}},
            },
        )

        self.assertEqual(find_anything("abstract", type=DataLayerType.RASTER), {})
        self.assertEqual(find_anything("pinyon", type=DataLayerType.RASTER), {})

    def test_metadata_search_escapes_like_wildcards(self):
        dataset = DatasetFactory(visibility="PUBLIC")
        DataLayerFactory.create(
            dataset=dataset,
            name="Layer A",
            status=DataLayerStatus.READY,
            type=DataLayerType.RASTER,
            metadata={"identification": {"abstract": "Canopy height"}},
        )

        self.assertEqual(find_anything("can%height", type=DataLayerType.RASTER), {})

    @override_settings(FEATURE_FLAGS=["DATA_ORGANIZATION"])
    def test_metadata_and_simple_category_respect_geometry(self):
        unit_square = GEOSGeometry(
            "MULTIPOLYGON (((0 0, 1 0, 1 1, 0 1, 0 0)))", srid=4269
        )
        far_square = GEOSGeometry(
            "MULTIPOLYGON (((5 5, 6 5, 6 6, 5 6, 5 5)))", srid=4269
        )
        dataset = DatasetFactory(visibility="PUBLIC")
        category = SimpleCategoryFactory.create(name="Juniper woodlands")
        inside = DataLayerFactory.create(
            dataset=dataset,
            name="Inside",
            status=DataLayerStatus.READY,
            type=DataLayerType.RASTER,
            outline=unit_square,
            metadata={"identification": {"abstract": "juniper encroachment"}},
            simple_categories=[category],
        )
        outside = DataLayerFactory.create(
            dataset=dataset,
            name="Outside",
            status=DataLayerStatus.READY,
            type=DataLayerType.RASTER,
            outline=far_square,
            metadata={"identification": {"abstract": "juniper encroachment"}},
            simple_categories=[category],
        )

        results = find_anything(
            "juniper",
            type=DataLayerType.RASTER,
            geometry=unit_square,
        )

        names = [r.name for r in results.values()]
        self.assertIn(inside.name, names)
        self.assertNotIn(outside.name, names)

    @override_settings(FEATURE_FLAGS=["DATA_ORGANIZATION"])
    def test_metadata_and_simple_category_respect_access(self):
        user = UserFactory.create()
        public_dataset = DatasetFactory(visibility=VisibilityOptions.PUBLIC)
        private_dataset = DatasetFactory(visibility=VisibilityOptions.PRIVATE)
        category = SimpleCategoryFactory.create(name="Manzanita chaparral")
        private_only = SimpleCategoryFactory.create(name="Manzanita barrens")
        metadata = {"identification": {"abstract": "manzanita cover"}}
        public_metadata = DataLayerFactory.create(
            dataset=public_dataset,
            name="Public metadata",
            status=DataLayerStatus.READY,
            type=DataLayerType.RASTER,
            metadata=metadata,
        )
        public_category = DataLayerFactory.create(
            dataset=public_dataset,
            name="Public category",
            status=DataLayerStatus.READY,
            type=DataLayerType.RASTER,
            simple_categories=[category],
        )
        private = DataLayerFactory.create(
            dataset=private_dataset,
            name="Private",
            status=DataLayerStatus.READY,
            type=DataLayerType.RASTER,
            metadata=metadata,
            simple_categories=[category, private_only],
        )

        results = find_anything("manzanita", type=DataLayerType.RASTER, user=user)

        names = [r.name for r in results.values()]
        self.assertIn(public_metadata.name, names)
        self.assertIn(public_category.name, names)
        self.assertNotIn(private.name, names)
        self.assertNotIn(f"SIMPLE_CATEGORY:{category.pk}", results)
        self.assertNotIn(f"SIMPLE_CATEGORY:{private_only.pk}", results)


class TestSearchFavorites(TestCase):
    def setUp(self):
        self.user = UserFactory.create()
        self.workspace = PlanningWorkspaceFactory.create(created_by=self.user)
        self.organization = OrganizationFactory.create(name="Sierra Org")
        self.favorite_dataset = DatasetFactory(
            name="Wildfire dataset",
            organization=self.organization,
            visibility=VisibilityOptions.PUBLIC,
        )
        self.other_dataset = DatasetFactory(
            name="Wildfire other dataset",
            organization=self.organization,
            visibility=VisibilityOptions.PUBLIC,
        )
        self.favorite_category = SimpleCategoryFactory.create(name="Wildfire risk")
        self.other_category = SimpleCategoryFactory.create(name="Wildfire hazard")
        self.favorite = DataLayerFactory.create(
            dataset=self.favorite_dataset,
            name="Wildfire favorite",
            status=DataLayerStatus.READY,
            type=DataLayerType.RASTER,
            simple_categories=[self.favorite_category],
        )
        self.not_favorite = DataLayerFactory.create(
            dataset=self.other_dataset,
            name="Wildfire not favorite",
            status=DataLayerStatus.READY,
            type=DataLayerType.RASTER,
            simple_categories=[self.other_category],
        )

    def search(self, term="wildfire", workspace=None):
        return find_anything(
            term,
            type=DataLayerType.RASTER,
            search_tab=SearchTab.FAVORITES,
            user=self.user,
            workspace=workspace or self.workspace,
        )

    def favorite_in(self, workspace, datalayer):
        WorkspaceFavoriteDataLayer.objects.create(
            workspace=workspace, datalayer=datalayer
        )

    def test_no_favorites_returns_nothing(self):
        self.assertEqual(self.search(), {})

    def test_returns_only_favorite_datalayers(self):
        self.favorite_in(self.workspace, self.favorite)

        results = self.search()

        self.assertIn(f"DATALAYER:{self.favorite.pk}", results)
        self.assertNotIn(f"DATALAYER:{self.not_favorite.pk}", results)

    def test_ignores_favorites_from_other_workspaces(self):
        other_workspace = PlanningWorkspaceFactory.create(created_by=self.user)
        self.favorite_in(other_workspace, self.not_favorite)
        self.favorite_in(self.workspace, self.favorite)

        results = self.search()

        self.assertIn(f"DATALAYER:{self.favorite.pk}", results)
        self.assertNotIn(f"DATALAYER:{self.not_favorite.pk}", results)

    def test_datasets_restricted_to_ones_with_favorites(self):
        self.favorite_in(self.workspace, self.favorite)

        results = self.search()

        self.assertIn(f"DATASET:{self.favorite_dataset.pk}", results)
        self.assertNotIn(f"DATASET:{self.other_dataset.pk}", results)

    def test_organization_match_restricted_to_datasets_with_favorites(self):
        self.favorite_in(self.workspace, self.favorite)

        results = self.search(term="sierra")

        self.assertIn(f"DATASET:{self.favorite_dataset.pk}", results)
        self.assertNotIn(f"DATASET:{self.other_dataset.pk}", results)

    @override_settings(FEATURE_FLAGS=["DATA_ORGANIZATION"])
    def test_simple_categories_restricted_to_ones_with_favorites(self):
        self.favorite_in(self.workspace, self.favorite)

        results = self.search()

        self.assertNotIn(f"SIMPLE_CATEGORY:{self.favorite_category.pk}", results)
        self.assertNotIn(f"SIMPLE_CATEGORY:{self.other_category.pk}", results)

    def test_metadata_match_restricted_to_favorites(self):
        metadata = {"identification": {"abstract": "sequoia groves"}}
        favorite = DataLayerFactory.create(
            dataset=self.favorite_dataset,
            name="Metadata favorite",
            status=DataLayerStatus.READY,
            type=DataLayerType.RASTER,
            metadata=metadata,
        )
        not_favorite = DataLayerFactory.create(
            dataset=self.favorite_dataset,
            name="Metadata not favorite",
            status=DataLayerStatus.READY,
            type=DataLayerType.RASTER,
            metadata=metadata,
        )
        self.favorite_in(self.workspace, favorite)

        results = self.search(term="sequoia")

        self.assertIn(f"DATALAYER:{favorite.pk}", results)
        self.assertNotIn(f"DATALAYER:{not_favorite.pk}", results)


class TestStorageURL(TestCase):
    @override_settings(PROVIDER="aws")
    @override_settings(S3_BUCKET="s3-bucket-name")
    def test_get_bucket_url_S3(self):
        self.assertEqual(
            get_bucket_url(),
            f"s3://{settings.S3_BUCKET}",
        )

    @override_settings(PROVIDER="gcp")
    @override_settings(GCS_BUCKET="gcs-bucket-name")
    def test_get_bucket_url_GCS(self):
        self.assertEqual(
            get_bucket_url(),
            f"gs://{settings.GCS_BUCKET}",
        )

    @override_settings(PROVIDER="aws")
    @override_settings(S3_BUCKET="s3-bucket-name")
    def test_get_storage_url_S3(self):
        uuid = str(uuid4())
        url = get_storage_url(
            organization_id=1,
            uuid=uuid,
            original_name="foo.pdf",
            mimetype="application/pdf",
        )
        self.assertEqual(
            url,
            f"s3://{settings.S3_BUCKET}/datalayers/1/{uuid}.pdf",
        )

    @override_settings(PROVIDER="gcp")
    @override_settings(GCS_BUCKET="gcs-bucket-name")
    def test_get_storage_url_GCS(self):
        uuid = str(uuid4())
        url = get_storage_url(
            organization_id=1,
            uuid=uuid,
            original_name="foo.pdf",
            mimetype="application/pdf",
        )
        self.assertEqual(
            url,
            f"gs://{settings.GCS_BUCKET}/datalayers/1/{uuid}.pdf",
        )
