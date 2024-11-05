from django.conf import settings
from unittest import mock
from uuid import uuid4
from django.test import TransactionTestCase, TestCase
from datasets.models import DataLayer
from datasets.tests.factories import DatasetFactory
from organizations.tests.factories import OrganizationFactory

from datasets.services import (
    create_datalayer,
    create_upload_url_for_org,
    get_object_name,
)


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
    @mock.patch(
        "datasets.services.create_upload_url",
        return_value={"url": "foo.pdf"},
    )
    def test_call_create_url_returns_url_with_both(self, create_upload_url_mock):
        uuid = str(uuid4())
        result = create_upload_url_for_org(1, uuid, "foo.pdf", "application/pdf")
        self.assertEqual(result, {"url": "foo.pdf"})
        create_upload_url_mock.assert_called_with(
            bucket_name=settings.S3_BUCKET,
            object_name=f"{settings.DATALAYERS_FOLDER}/1/{uuid}.pdf",
            expiration=settings.UPLOAD_EXPIRATION_TTL,
        )


class TestCreateDataLayer(TransactionTestCase):
    @mock.patch(
        "datasets.services.create_upload_url",
        return_value={"url": "foo"},
    )
    def test_create_datalayer_returns_url_and_datalayer(self, create_upload_url_mock):
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

    @mock.patch("datasets.services.create_upload_url", side_effect=ValueError("boom"))
    def test_create_datalayer_exception_does_not_create_datalayer(
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
