from unittest import mock
from uuid import uuid4

from django.conf import settings
from django.test import TestCase, override_settings
from organizations.tests.factories import OrganizationFactory

from datasets.models import Category, DataLayer, DataLayerStatus, DataLayerType
from datasets.services import (
    create_datalayer,
    create_upload_url_for_org,
    find_anything,
    get_object_name,
    get_bucket_url,
    get_storage_url,
)
from datasets.tests.factories import DataLayerFactory, DatasetFactory


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


class TestSearch(TestCase):
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

        results = find_anything("fire")
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
