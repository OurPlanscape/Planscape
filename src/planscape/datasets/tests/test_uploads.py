import shutil
from datetime import timedelta
from pathlib import Path
from unittest import mock

from django.contrib.gis.geos import Polygon
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase
from workspaces.tests.factories import (
    PlanningWorkspaceFactory,
    UserAccessWorkspaceFactory,
)
from workspaces.models import WorkspaceRole

from datasets.models import (
    DataLayer,
    DataLayerStatus,
    DataLayerType,
    Dataset,
    Style,
    WorkspaceFavoriteDataLayer,
)
from datasets.services import (
    create_workspace_upload,
    expire_stale_uploads,
    get_or_create_workspace_upload_dataset,
    upload_dataset_name,
)
from datasets.tasks import process_uploaded_datalayer
from datasets.upload_metadata import read_upload_metadata, write_upload_metadata
from datasets.tests.factories import DataLayerFactory
from planscape.tests.factories import UserFactory

ASSETS = Path(__file__).parent / "assets"
BUCKET = "test-bucket"
SESSION = {"url": "https://storage.googleapis.com/upload/session"}


def make_upload(workspace, status=DataLayerStatus.PENDING, **kwargs):
    dataset = get_or_create_workspace_upload_dataset(workspace, workspace.created_by)
    kwargs.setdefault("metadata", {"modules": {"map": {"enabled": True}}})
    datalayer = DataLayerFactory.create(
        dataset=dataset,
        organization=None,
        created_by=workspace.created_by,
        workspace=workspace,
        type=DataLayerType.RASTER,
        status=status,
        info=None,
        **kwargs,
    )
    datalayer.raw_url = (
        f"gs://{BUCKET}/uploads/raw/workspaces/{workspace.pk}/{datalayer.uuid}.tif"
    )
    datalayer.save()
    return datalayer


@override_settings(PROVIDER="gcp", GCS_BUCKET=BUCKET)
@mock.patch("datasets.services.create_upload_url_gcs", return_value=SESSION)
class CreateWorkspaceDataLayerTest(APITestCase):
    def setUp(self):
        self.owner = UserFactory.create()
        self.collaborator = UserFactory.create()
        self.viewer = UserFactory.create()
        self.workspace = PlanningWorkspaceFactory.create(created_by=self.owner)
        UserAccessWorkspaceFactory.create(
            user=self.collaborator,
            workspace=self.workspace,
            role=WorkspaceRole.COLLABORATOR,
        )
        UserAccessWorkspaceFactory.create(
            user=self.viewer, workspace=self.workspace, role=WorkspaceRole.VIEWER
        )
        self.url = reverse(
            "api:datasets:workspace-datalayers-list",
            kwargs={"workspace_pk": self.workspace.pk},
        )
        self.payload = {
            "name": "Canopy cover",
            "original_name": "canopy.TIF",
            "size": 500 * 1024**2,
        }

    def test_collaborator_creates_pending_upload(self, upload_url):
        self.client.force_authenticate(self.collaborator)
        response = self.client.post(
            self.url,
            self.payload,
            format="json",
            HTTP_ORIGIN="http://localhost:4200",
        )
        self.assertEqual(response.status_code, 201, response.content)
        body = response.json()
        self.assertEqual(body["upload_to"], SESSION)
        self.assertEqual(body["datalayer"]["status"], "PENDING")
        self.assertEqual(body["datalayer"]["file_size"], self.payload["size"])
        datalayer = DataLayer.objects.get(pk=body["datalayer"]["id"])
        self.assertEqual(datalayer.metadata, {"modules": {"map": {"enabled": True}}})

        datalayer = DataLayer.objects.get(pk=body["datalayer"]["id"])
        self.assertEqual(datalayer.workspace, self.workspace)
        self.assertEqual(datalayer.dataset.workspace, self.workspace)
        self.assertEqual(datalayer.dataset.name, upload_dataset_name(self.collaborator))
        self.assertEqual(datalayer.dataset.created_by, self.collaborator)
        self.assertTrue(
            datalayer.raw_url.startswith(
                f"gs://{BUCKET}/uploads/raw/workspaces/{self.workspace.pk}/"
            )
        )
        self.assertTrue(datalayer.raw_url.endswith(".tif"))
        upload_url.assert_called_once_with(
            object_name=datalayer.raw_url.removeprefix(f"gs://{BUCKET}/"),
            bucket_name=BUCKET,
            content_type="image/tiff",
            size=self.payload["size"],
            origin="http://localhost:4200",
        )

    def test_unknown_origin_is_not_passed(self, upload_url):
        self.client.force_authenticate(self.owner)
        self.client.post(
            self.url, self.payload, format="json", HTTP_ORIGIN="https://evil.test"
        )
        self.assertIsNone(upload_url.call_args.kwargs["origin"])

    def test_uploads_share_one_dataset(self, upload_url):
        self.client.force_authenticate(self.owner)
        self.client.post(self.url, self.payload, format="json")
        self.client.post(self.url, {**self.payload, "name": "Other"}, format="json")
        self.assertEqual(Dataset.objects.filter(workspace=self.workspace).count(), 1)

    def test_each_uploader_gets_their_own_dataset(self, upload_url):
        self.client.force_authenticate(self.owner)
        self.client.post(self.url, self.payload, format="json")
        self.client.force_authenticate(self.collaborator)
        self.client.post(self.url, {**self.payload, "name": "Other"}, format="json")
        names = set(
            Dataset.objects.filter(workspace=self.workspace).values_list(
                "name", flat=True
            )
        )
        self.assertEqual(
            names,
            {upload_dataset_name(self.owner), upload_dataset_name(self.collaborator)},
        )

    def test_name_is_unique_across_uploaders(self, upload_url):
        self.client.force_authenticate(self.owner)
        self.client.post(self.url, self.payload, format="json")
        self.client.force_authenticate(self.collaborator)
        response = self.client.post(self.url, self.payload, format="json")
        self.assertEqual(response.status_code, 400)

    def test_dataset_name_falls_back_to_email(self, upload_url):
        user = UserFactory.create(first_name="", last_name="")
        self.assertEqual(upload_dataset_name(user), f"{user.email} uploaded data")

    def test_viewer_is_forbidden(self, upload_url):
        self.client.force_authenticate(self.viewer)
        response = self.client.post(self.url, self.payload, format="json")
        self.assertEqual(response.status_code, 403)

    def test_non_member_gets_404(self, upload_url):
        self.client.force_authenticate(UserFactory.create())
        response = self.client.post(self.url, self.payload, format="json")
        self.assertEqual(response.status_code, 404)

    def test_anonymous_is_rejected(self, upload_url):
        response = self.client.post(self.url, self.payload, format="json")
        self.assertIn(response.status_code, (401, 403))

    def test_rejects_non_geotiff(self, upload_url):
        self.client.force_authenticate(self.owner)
        response = self.client.post(
            self.url, {**self.payload, "original_name": "layer.zip"}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("original_name", response.json()["errors"])

    @override_settings(DATALAYER_UPLOAD_MAX_BYTES=1024)
    def test_rejects_oversized_file(self, upload_url):
        self.client.force_authenticate(self.owner)
        response = self.client.post(self.url, self.payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("size", response.json()["errors"])

    def test_rejects_duplicate_name(self, upload_url):
        self.client.force_authenticate(self.owner)
        self.client.post(self.url, self.payload, format="json")
        response = self.client.post(self.url, self.payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("name", response.json()["errors"])

    def test_name_is_free_again_after_delete(self, upload_url):
        self.client.force_authenticate(self.owner)
        created = self.client.post(self.url, self.payload, format="json").json()
        with mock.patch("datasets.services.delete_gcs_file"):
            self.client.delete(f"{self.url}{created['datalayer']['id']}/")
        response = self.client.post(self.url, self.payload, format="json")
        self.assertEqual(response.status_code, 201, response.content)

    @override_settings(PROVIDER="aws")
    def test_not_supported_outside_gcs(self, upload_url):
        self.client.force_authenticate(self.owner)
        response = self.client.post(self.url, self.payload, format="json")
        self.assertEqual(response.status_code, 501)
        self.assertFalse(DataLayer.objects.filter(name="Canopy cover").exists())


@override_settings(GCS_BUCKET=BUCKET)
class ListAndDeleteWorkspaceDataLayersTest(APITestCase):
    def setUp(self):
        self.owner = UserFactory.create()
        self.viewer = UserFactory.create()
        self.workspace = PlanningWorkspaceFactory.create(created_by=self.owner)
        UserAccessWorkspaceFactory.create(
            user=self.viewer, workspace=self.workspace, role=WorkspaceRole.VIEWER
        )
        self.url = reverse(
            "api:datasets:workspace-datalayers-list",
            kwargs={"workspace_pk": self.workspace.pk},
        )

    def test_lists_uploads_in_every_status(self):
        pending = make_upload(self.workspace)
        failed = make_upload(
            self.workspace,
            status=DataLayerStatus.FAILED,
            failure_reason="No CRS",
        )
        make_upload(PlanningWorkspaceFactory.create())
        DataLayerFactory.create(workspace=self.workspace)  # not an upload

        self.client.force_authenticate(self.owner)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        results = response.json()["results"]
        self.assertEqual({r["id"] for r in results}, {pending.pk, failed.pk})
        failed_row = next(r for r in results if r["id"] == failed.pk)
        self.assertEqual(failed_row["failure_reason"], "No CRS")
        self.assertTrue(failed_row["creator_name"])

    def test_viewer_cannot_list(self):
        self.client.force_authenticate(self.viewer)
        self.assertEqual(self.client.get(self.url).status_code, 403)

    @mock.patch("datasets.services.delete_gcs_file")
    def test_delete_soft_deletes_and_removes_raw_file(self, delete_file):
        datalayer = make_upload(self.workspace)
        self.client.force_authenticate(self.owner)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.delete(f"{self.url}{datalayer.pk}/")
        self.assertEqual(response.status_code, 204)
        self.assertFalse(DataLayer.objects.filter(pk=datalayer.pk).exists())
        self.assertTrue(DataLayer.dead_or_alive.filter(pk=datalayer.pk).exists())
        delete_file.assert_called_once_with(datalayer.raw_url)

    def test_cannot_delete_layer_from_another_workspace(self):
        other = make_upload(PlanningWorkspaceFactory.create())
        self.client.force_authenticate(self.owner)
        response = self.client.delete(f"{self.url}{other.pk}/")
        self.assertEqual(response.status_code, 404)


@override_settings(
    GCS_BUCKET=BUCKET,
    GCS_PUSH_AUDIENCE="https://planscape.test/webhook",
    GCS_PUSH_SERVICE_ACCOUNT="pubsub@test.iam.gserviceaccount.com",
)
@mock.patch("datasets.webhooks.process_uploaded_datalayer.delay")
@mock.patch("datasets.webhooks.id_token.verify_oauth2_token")
class GCSUploadWebhookTest(APITestCase):
    def setUp(self):
        self.url = reverse("api:gcs-datalayer-uploaded")
        self.workspace = PlanningWorkspaceFactory.create()
        self.datalayer = make_upload(self.workspace)
        self.claims = {
            "email": "pubsub@test.iam.gserviceaccount.com",
            "email_verified": True,
        }

    def push(self, object_url=None, event_type="OBJECT_FINALIZE"):
        bucket, key = (
            (object_url or self.datalayer.raw_url).removeprefix("gs://").split("/", 1)
        )
        return self.client.post(
            self.url,
            {
                "message": {
                    "attributes": {
                        "eventType": event_type,
                        "bucketId": bucket,
                        "objectId": key,
                    }
                },
                "subscription": "projects/p/subscriptions/s",
            },
            format="json",
            HTTP_AUTHORIZATION="Bearer token",
        )

    def test_enqueues_processing(self, verify, delay):
        verify.return_value = self.claims
        response = self.push()
        self.assertEqual(response.status_code, 204)
        delay.assert_called_once_with(self.datalayer.pk)

    def test_rejects_invalid_token(self, verify, delay):
        verify.side_effect = ValueError("bad token")
        self.assertEqual(self.push().status_code, 401)
        delay.assert_not_called()

    def test_rejects_other_service_account(self, verify, delay):
        verify.return_value = {**self.claims, "email": "someone@else.test"}
        self.assertEqual(self.push().status_code, 401)
        delay.assert_not_called()

    def test_rejects_missing_token(self, verify, delay):
        response = self.client.post(self.url, {}, format="json")
        self.assertEqual(response.status_code, 401)

    @override_settings(GCS_PUSH_AUDIENCE=None)
    def test_rejects_when_not_configured(self, verify, delay):
        verify.return_value = self.claims
        self.assertEqual(self.push().status_code, 401)

    def test_ignores_other_events(self, verify, delay):
        verify.return_value = self.claims
        self.assertEqual(self.push(event_type="OBJECT_DELETE").status_code, 204)
        delay.assert_not_called()

    def test_ignores_objects_outside_raw_prefix(self, verify, delay):
        verify.return_value = self.claims
        response = self.push(f"gs://{BUCKET}/datalayers/workspaces/1/x.tif")
        self.assertEqual(response.status_code, 204)
        delay.assert_not_called()

    def test_ignores_unknown_objects(self, verify, delay):
        verify.return_value = self.claims
        response = self.push(f"gs://{BUCKET}/uploads/raw/workspaces/1/nope.tif")
        self.assertEqual(response.status_code, 204)
        delay.assert_not_called()

    def test_ignores_uploads_already_claimed(self, verify, delay):
        verify.return_value = self.claims
        self.datalayer.status = DataLayerStatus.PROCESSING
        self.datalayer.save()
        self.assertEqual(self.push().status_code, 204)
        delay.assert_not_called()


def fake_download(gs_url, output_file):
    shutil.copy(ASSETS / "raster1.tif", output_file)


@override_settings(GCS_BUCKET=BUCKET, PROVIDER="gcp")
@mock.patch("datasets.tasks.datalayer_file_post_process.delay")
@mock.patch("datasets.services.delete_gcs_file")
@mock.patch("datasets.tasks.get_gcs_hash", return_value="crc")
@mock.patch("datasets.tasks.upload_file_via_cli")
@mock.patch("datasets.tasks.download_file", side_effect=fake_download)
@mock.patch("datasets.tasks.get_file_size", return_value=1024)
class ProcessUploadedDataLayerTest(TestCase):
    def setUp(self):
        self.workspace = PlanningWorkspaceFactory.create()
        self.datalayer = make_upload(self.workspace)

    def test_success_makes_layer_ready(
        self, size, download, upload, gcs_hash, delete_file, post_process
    ):
        process_uploaded_datalayer(self.datalayer.pk)

        self.datalayer.refresh_from_db()
        self.assertEqual(self.datalayer.status, DataLayerStatus.READY)
        self.assertIsNone(self.datalayer.failure_reason)
        self.assertEqual(
            self.datalayer.url,
            f"gs://{BUCKET}/datalayers/workspaces/{self.workspace.pk}/"
            f"{self.datalayer.uuid}.tif",
        )
        self.assertEqual(self.datalayer.info["crs"], "EPSG:3857")
        self.assertTrue(self.datalayer.info["stats"])
        self.assertIsNotNone(self.datalayer.geometry)
        self.assertIsNotNone(self.datalayer.outline)
        self.assertEqual(self.datalayer.hash, "crc")
        upload.assert_called_once()
        self.assertEqual(
            upload.call_args.kwargs["object_name"],
            f"datalayers/workspaces/{self.workspace.pk}/{self.datalayer.uuid}.tif",
        )
        delete_file.assert_called_once_with(self.datalayer.raw_url)
        post_process.assert_called_once_with(datalayer_id=self.datalayer.pk)

    def test_second_delivery_is_a_no_op(
        self, size, download, upload, gcs_hash, delete_file, post_process
    ):
        process_uploaded_datalayer(self.datalayer.pk)
        process_uploaded_datalayer(self.datalayer.pk)
        download.assert_called_once()

    def test_missing_crs_fails_with_reason(
        self, size, download, upload, gcs_hash, delete_file, post_process
    ):
        with mock.patch(
            "datasets.tasks.to_planscape_streaming",
            side_effect=ValueError(
                "Cannot convert to planscape format if raster file does not have CRS information."
            ),
        ):
            process_uploaded_datalayer(self.datalayer.pk)

        self.datalayer.refresh_from_db()
        self.assertEqual(self.datalayer.status, DataLayerStatus.FAILED)
        self.assertIn("coordinate reference system", self.datalayer.failure_reason)
        delete_file.assert_not_called()
        upload.assert_not_called()

    @override_settings(DATALAYER_UPLOAD_MAX_BYTES=10)
    def test_oversized_object_fails(
        self, size, download, upload, gcs_hash, delete_file, post_process
    ):
        process_uploaded_datalayer(self.datalayer.pk)

        self.datalayer.refresh_from_db()
        self.assertEqual(self.datalayer.status, DataLayerStatus.FAILED)
        self.assertIn("limit", self.datalayer.failure_reason)
        download.assert_not_called()

    def test_publishes_status_changes(
        self, size, download, upload, gcs_hash, delete_file, post_process
    ):
        with mock.patch("datasets.events.publish_workspace_event") as publish:
            process_uploaded_datalayer(self.datalayer.pk)

        statuses = [
            call.kwargs["data"]["status"]
            for call in publish.call_args_list
            if call.args[1] == "datasets.datalayer.status_changed"
        ]
        self.assertEqual(statuses, ["PROCESSING", "READY"])

    def test_status_changes_name_the_uploader(
        self, size, download, upload, gcs_hash, delete_file, post_process
    ):
        with mock.patch("datasets.events.publish_workspace_event") as publish:
            process_uploaded_datalayer(self.datalayer.pk)

        uploaders = {
            call.kwargs["data"]["created_by"]
            for call in publish.call_args_list
            if call.args[1] == "datasets.datalayer.status_changed"
        }
        self.assertEqual(uploaders, {self.datalayer.created_by_id})


class ReadPathsTest(APITestCase):
    def setUp(self):
        self.owner = UserFactory.create()
        self.workspace = PlanningWorkspaceFactory.create(created_by=self.owner)

    def test_unfinished_upload_is_hidden_from_datalayer_endpoints(self):
        pending = make_upload(self.workspace)
        self.client.force_authenticate(self.owner)
        detail = reverse("api:datasets:datalayers-detail", kwargs={"pk": pending.pk})
        self.assertEqual(self.client.get(detail).status_code, 404)
        urls = reverse("api:datasets:datalayers-urls", kwargs={"pk": pending.pk})
        self.assertEqual(self.client.get(urls).status_code, 404)

    def test_members_get_urls_for_ready_uploads(self):
        ready = make_upload(
            self.workspace,
            status=DataLayerStatus.READY,
            url=f"gs://{BUCKET}/datalayers/workspaces/1/x.tif",
        )
        urls = reverse("api:datasets:datalayers-urls", kwargs={"pk": ready.pk})

        self.client.force_authenticate(UserFactory.create())
        self.assertEqual(self.client.get(urls).status_code, 404)

        self.client.force_authenticate(self.owner)
        with mock.patch.object(DataLayer, "get_map_url", return_value="https://cog"):
            response = self.client.get(urls)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"layer_url": "https://cog"})


@override_settings(
    GCS_BUCKET=BUCKET,
    DATALAYER_UPLOAD_PENDING_TTL_HOURS=24,
    DATALAYER_UPLOAD_PROCESSING_TTL_HOURS=2,
)
@mock.patch("datasets.services.delete_gcs_file")
class ExpireStaleUploadsTest(TestCase):
    def setUp(self):
        self.workspace = PlanningWorkspaceFactory.create()

    def age(self, datalayer, hours):
        DataLayer.objects.filter(pk=datalayer.pk).update(
            created_at=timezone.now() - timedelta(hours=hours),
            updated_at=timezone.now() - timedelta(hours=hours),
        )

    def test_expires_old_pending_and_stuck_processing(self, delete_file):
        old_pending = make_upload(self.workspace)
        fresh_pending = make_upload(self.workspace)
        stuck = make_upload(self.workspace, status=DataLayerStatus.PROCESSING)
        self.age(old_pending, 25)
        self.age(stuck, 3)

        self.assertEqual(expire_stale_uploads(), 2)

        old_pending.refresh_from_db()
        fresh_pending.refresh_from_db()
        stuck.refresh_from_db()
        self.assertEqual(old_pending.status, DataLayerStatus.FAILED)
        self.assertEqual(old_pending.failure_reason, "The upload never completed.")
        self.assertEqual(fresh_pending.status, DataLayerStatus.PENDING)
        self.assertEqual(stuck.status, DataLayerStatus.FAILED)
        self.assertEqual(stuck.failure_reason, "Processing timed out.")
        delete_file.assert_called_once_with(old_pending.raw_url)


@override_settings(PROVIDER="gcp", GCS_BUCKET=BUCKET)
@mock.patch("datasets.services.create_upload_url_gcs", return_value=SESSION)
class CreateWorkspaceUploadEventsTest(TestCase):
    def test_publishes_created(self, upload_url):
        workspace = PlanningWorkspaceFactory.create()
        with mock.patch("datasets.events.publish_workspace_event") as publish:
            result = create_workspace_upload(
                workspace=workspace,
                created_by=workspace.created_by,
                name="Layer",
                original_name="layer.tif",
                size=10,
            )
        publish.assert_called_once()
        self.assertEqual(publish.call_args.args[0], workspace.pk)
        self.assertEqual(publish.call_args.args[1], "datasets.datalayer.created")
        self.assertEqual(
            publish.call_args.kwargs["obj"],
            {"kind": "datalayer", "id": result["datalayer"].pk},
        )
        self.assertEqual(publish.call_args.kwargs["data"]["status"], "PENDING")


class EditWorkspaceDataLayerTest(APITestCase):
    def setUp(self):
        self.owner = UserFactory.create()
        self.collaborator = UserFactory.create()
        self.viewer = UserFactory.create()
        self.workspace = PlanningWorkspaceFactory.create(created_by=self.owner)
        UserAccessWorkspaceFactory.create(
            user=self.collaborator,
            workspace=self.workspace,
            role=WorkspaceRole.COLLABORATOR,
        )
        UserAccessWorkspaceFactory.create(
            user=self.viewer, workspace=self.workspace, role=WorkspaceRole.VIEWER
        )
        self.datalayer = make_upload(
            self.workspace,
            status=DataLayerStatus.READY,
            name="Canopy",
            geometry=Polygon.from_bbox((-121.0, 38.0, -120.0, 39.0)),
            metadata={"modules": {"map": {"enabled": True}}},
        )
        self.url = reverse(
            "api:datasets:workspace-datalayers-detail",
            kwargs={"workspace_pk": self.workspace.pk, "pk": self.datalayer.pk},
        )

    def test_retrieve_returns_metadata_and_extent(self):
        self.client.force_authenticate(self.collaborator)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200, response.content)
        body = response.json()
        self.assertEqual(body["name"], "Canopy")
        self.assertEqual(body["description"], "")
        self.assertEqual(body["units"], "")
        self.assertEqual(body["bbox"], [-121.0, 38.0, -120.0, 39.0])

    def test_patch_writes_where_the_tooltip_reads(self):
        self.client.force_authenticate(self.collaborator)
        response = self.client.patch(
            self.url,
            {
                "description": "Canopy cover in 2024",
                "units": "Percent",
                "vintage": "2024",
                "geographic_coverage": "California",
                "source_url": "https://example.org/canopy",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["units"], "Percent")

        self.datalayer.refresh_from_db()
        metadata = self.datalayer.metadata
        identification = metadata["metadata"]["identification"]
        self.assertEqual(identification["description"], "Canopy cover in 2024")
        self.assertEqual(
            identification["keywords"]["units"],
            {"keywords": ["Percent"], "keywords_type": "unit"},
        )
        self.assertEqual(identification["date"]["date"], "2024")
        self.assertEqual(identification["geographicCoverage"], "California")
        self.assertEqual(
            metadata["metadata"]["distribution"]["download"]["url"],
            "https://example.org/canopy",
        )
        self.assertEqual(metadata["modules"], {"map": {"enabled": True}})

    def test_blank_values_remove_keys(self):
        self.client.force_authenticate(self.owner)
        self.client.patch(self.url, {"units": "Percent"}, format="json")
        self.client.patch(self.url, {"units": ""}, format="json")

        self.datalayer.refresh_from_db()
        self.assertNotIn("metadata", self.datalayer.metadata)
        self.assertEqual(self.datalayer.metadata["modules"], {"map": {"enabled": True}})

    def test_only_sent_fields_change(self):
        self.client.force_authenticate(self.owner)
        self.client.patch(self.url, {"units": "Percent"}, format="json")
        response = self.client.patch(self.url, {"name": "Canopy 2024"}, format="json")

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["name"], "Canopy 2024")
        self.assertEqual(response.json()["units"], "Percent")

    def test_rejects_duplicate_name(self):
        make_upload(self.workspace, status=DataLayerStatus.READY, name="Taken")
        self.client.force_authenticate(self.owner)
        response = self.client.patch(self.url, {"name": "Taken"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("name", response.json()["errors"])

    def test_keeping_its_own_name_is_fine(self):
        self.client.force_authenticate(self.owner)
        response = self.client.patch(self.url, {"name": "Canopy"}, format="json")
        self.assertEqual(response.status_code, 200, response.content)

    def test_rejects_non_web_source_url(self):
        self.client.force_authenticate(self.owner)
        response = self.client.patch(
            self.url, {"source_url": "javascript:alert(1)"}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        response = self.client.patch(
            self.url, {"source_url": "ftp://example.org/file"}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_only_ready_layers_can_be_edited(self):
        self.datalayer.status = DataLayerStatus.PROCESSING
        self.datalayer.save()
        self.client.force_authenticate(self.owner)
        response = self.client.patch(self.url, {"units": "Percent"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_viewer_is_forbidden(self):
        self.client.force_authenticate(self.viewer)
        self.assertEqual(self.client.get(self.url).status_code, 403)
        response = self.client.patch(self.url, {"units": "x"}, format="json")
        self.assertEqual(response.status_code, 403)

    def test_layer_from_another_workspace_is_not_found(self):
        other = make_upload(
            PlanningWorkspaceFactory.create(), status=DataLayerStatus.READY
        )
        url = reverse(
            "api:datasets:workspace-datalayers-detail",
            kwargs={"workspace_pk": self.workspace.pk, "pk": other.pk},
        )
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.get(url).status_code, 404)
        self.assertEqual(
            self.client.patch(url, {"units": "x"}, format="json").status_code, 404
        )

    def test_put_is_not_allowed(self):
        self.client.force_authenticate(self.owner)
        response = self.client.put(self.url, {"name": "x"}, format="json")
        self.assertEqual(response.status_code, 405)

    def test_publishes_updated(self):
        self.client.force_authenticate(self.owner)
        with mock.patch("datasets.events.publish_workspace_event") as publish:
            self.client.patch(self.url, {"name": "Renamed"}, format="json")

        publish.assert_called_once()
        self.assertEqual(publish.call_args.args[1], "datasets.datalayer.updated")
        self.assertEqual(publish.call_args.kwargs["data"]["name"], "Renamed")


STYLE = {
    "map_type": "RAMP",
    "entries": [
        {"value": 0, "color": "#ffffff", "label": "Low"},
        {"value": 50, "color": "#ff0000"},
        {"value": 100, "color": "#000000", "label": "High"},
    ],
}


class UploadStyleTest(APITestCase):
    def setUp(self):
        self.owner = UserFactory.create()
        self.workspace = PlanningWorkspaceFactory.create(created_by=self.owner)
        self.datalayer = make_upload(
            self.workspace, status=DataLayerStatus.READY, name="Canopy"
        )
        self.datalayer.info = {"stats": [{"min": 0, "max": 100}], "nodata": -9999}
        self.datalayer.save()
        self.url = reverse(
            "api:datasets:workspace-datalayers-detail",
            kwargs={"workspace_pk": self.workspace.pk, "pk": self.datalayer.pk},
        )
        self.client.force_authenticate(self.owner)

    def public_styles(self):
        url = reverse("api:datasets:datalayers-detail", args=[self.datalayer.pk])
        return self.client.get(url).json()["styles"]

    def test_starts_with_the_automatic_ramp(self):
        body = self.client.get(self.url).json()
        self.assertFalse(body["custom_style"])
        self.assertEqual(body["style"]["map_type"], "RAMP")
        self.assertEqual(len(body["style"]["entries"]), 7)
        self.assertEqual(body["default_style"], body["style"])

    def test_sets_a_custom_style(self):
        response = self.client.patch(self.url, {"style": STYLE}, format="json")
        self.assertEqual(response.status_code, 200, response.content)
        body = response.json()
        self.assertTrue(body["custom_style"])
        self.assertEqual(
            [(e["value"], e["color"], e["label"]) for e in body["style"]["entries"]],
            [(0, "#ffffff", "Low"), (50, "#ff0000", "50"), (100, "#000000", "High")],
        )

        self.assertEqual(len(body["default_style"]["entries"]), 7)

        style = Style.objects.get(workspace=self.workspace)
        self.assertIsNone(style.organization)
        self.assertEqual(style.name, f"upload-{self.datalayer.uuid}")
        self.assertEqual(self.public_styles()[0]["id"], style.pk)

    def test_saving_again_updates_the_same_style(self):
        self.client.patch(self.url, {"style": STYLE}, format="json")
        recolored = {**STYLE, "map_type": "INTERVALS"}
        self.client.patch(self.url, {"style": recolored}, format="json")

        self.assertEqual(Style.objects.filter(workspace=self.workspace).count(), 1)
        self.assertEqual(self.public_styles()[0]["data"]["map_type"], "INTERVALS")

    def test_null_goes_back_to_the_automatic_ramp(self):
        self.client.patch(self.url, {"style": STYLE}, format="json")
        response = self.client.patch(self.url, {"style": None}, format="json")

        self.assertEqual(response.status_code, 200, response.content)
        self.assertFalse(response.json()["custom_style"])
        self.assertFalse(Style.objects.filter(workspace=self.workspace).exists())
        self.assertEqual(self.public_styles()[0]["id"], 0)

    def test_keeps_transparency_for_nodata(self):
        sneaky = {**STYLE, "no_data": {"values": [], "opacity": 1}}
        self.client.patch(self.url, {"style": sneaky}, format="json")

        no_data = self.public_styles()[0]["data"]["no_data"]
        self.assertEqual(no_data["opacity"], 0)
        self.assertEqual(no_data["values"], ["nan", -9999])

    def test_metadata_and_style_in_one_request(self):
        response = self.client.patch(
            self.url, {"units": "Percent", "style": STYLE}, format="json"
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["units"], "Percent")
        self.assertTrue(response.json()["custom_style"])

    def test_leaving_style_out_keeps_it(self):
        self.client.patch(self.url, {"style": STYLE}, format="json")
        self.client.patch(self.url, {"units": "Percent"}, format="json")
        self.assertTrue(self.client.get(self.url).json()["custom_style"])

    def test_rejects_invalid_styles(self):
        invalid = [
            {**STYLE, "map_type": "CATEGORIES"},
            {**STYLE, "entries": STYLE["entries"][:1]},
            {**STYLE, "entries": [{"value": i, "color": "#000000"} for i in range(21)]},
            {
                **STYLE,
                "entries": [{**STYLE["entries"][0], "color": "red"}]
                + STYLE["entries"][1:],
            },
            {**STYLE, "entries": list(reversed(STYLE["entries"]))},
            {
                "map_type": "VALUES",
                "entries": [
                    {"value": 1, "color": "#000000"},
                    {"value": 1, "color": "#ffffff"},
                ],
            },
        ]
        for style in invalid:
            with self.subTest(style=style):
                response = self.client.patch(self.url, {"style": style}, format="json")
                self.assertEqual(response.status_code, 400)
        self.assertFalse(Style.objects.filter(workspace=self.workspace).exists())

    def test_values_style_takes_any_order(self):
        style = {
            "map_type": "VALUES",
            "entries": [
                {"value": 3, "color": "#000000"},
                {"value": 1, "color": "#ffffff"},
            ],
        }
        response = self.client.patch(self.url, {"style": style}, format="json")
        self.assertEqual(response.status_code, 200, response.content)

    def test_values_style_takes_a_single_value(self):
        style = {"map_type": "VALUES", "entries": [{"value": 1, "color": "#aa00ff"}]}
        response = self.client.patch(self.url, {"style": style}, format="json")
        self.assertEqual(response.status_code, 200, response.content)

    def test_cannot_style_another_workspace_layer(self):
        other = make_upload(
            PlanningWorkspaceFactory.create(), status=DataLayerStatus.READY
        )
        url = reverse(
            "api:datasets:workspace-datalayers-detail",
            kwargs={"workspace_pk": self.workspace.pk, "pk": other.pk},
        )
        response = self.client.patch(url, {"style": STYLE}, format="json")
        self.assertEqual(response.status_code, 404)


class BrowseUploadedTest(APITestCase):
    def setUp(self):
        self.owner = UserFactory.create()
        self.viewer = UserFactory.create()
        self.outsider = UserFactory.create()
        self.workspace = PlanningWorkspaceFactory.create(created_by=self.owner)
        UserAccessWorkspaceFactory.create(
            user=self.viewer, workspace=self.workspace, role=WorkspaceRole.VIEWER
        )
        self.ready = make_upload(
            self.workspace, status=DataLayerStatus.READY, name="Canopy"
        )
        self.favorite = make_upload(
            self.workspace, status=DataLayerStatus.READY, name="Aspect"
        )
        WorkspaceFavoriteDataLayer.objects.create(
            workspace=self.workspace, datalayer=self.favorite
        )
        make_upload(self.workspace, status=DataLayerStatus.PROCESSING)
        make_upload(self.workspace, status=DataLayerStatus.FAILED)
        make_upload(PlanningWorkspaceFactory.create(), status=DataLayerStatus.READY)
        self.url = reverse("api:datasets:datalayers-browse")
        self.body = {
            "search_tab": "uploaded",
            "workspace_id": self.workspace.pk,
            "type": "RASTER",
            "module": "map",
        }

    def test_lists_ready_uploads_with_favorites_marked(self):
        self.client.force_authenticate(self.viewer)
        response = self.client.post(self.url, self.body, format="json")

        self.assertEqual(response.status_code, 200, response.content)
        rows = {row["name"]: row["is_favorite"] for row in response.json()}
        self.assertEqual(rows, {"Aspect": True, "Canopy": False})

    def test_requires_a_workspace(self):
        self.client.force_authenticate(self.owner)
        body = {**self.body}
        del body["workspace_id"]
        response = self.client.post(self.url, body, format="json")
        self.assertEqual(response.status_code, 400)

    def test_outsiders_cannot_browse_the_workspace(self):
        self.client.force_authenticate(self.outsider)
        response = self.client.post(self.url, self.body, format="json")
        self.assertEqual(response.status_code, 400)

    def test_favorites_tab_still_only_lists_favorites(self):
        self.client.force_authenticate(self.owner)
        response = self.client.post(
            self.url, {**self.body, "search_tab": "favorites"}, format="json"
        )
        self.assertEqual([row["name"] for row in response.json()], ["Aspect"])


class UploadMetadataTest(TestCase):
    def test_round_trip(self):
        values = {
            "description": "About",
            "units": "Percent",
            "vintage": "2024",
            "geographic_coverage": "CA",
            "source_url": "https://example.org",
        }
        self.assertEqual(
            read_upload_metadata(write_upload_metadata(None, values)), values
        )

    def test_reads_catalog_shaped_units(self):
        metadata = {
            "metadata": {
                "identification": {
                    "keywords": {"units": {"keywords": ["", "Fuel Models"]}}
                }
            }
        }
        self.assertEqual(read_upload_metadata(metadata)["units"], "Fuel Models")

    def test_ignores_unexpected_shapes(self):
        metadata = {"metadata": {"identification": "not a dict"}}
        self.assertEqual(read_upload_metadata(metadata)["description"], "")

    def test_does_not_modify_the_input(self):
        metadata = {"metadata": {"identification": {"description": "Old"}}}
        write_upload_metadata(metadata, {"description": "New"})
        self.assertEqual(metadata["metadata"]["identification"]["description"], "Old")

    def test_blank_keeps_siblings(self):
        metadata = write_upload_metadata(
            None, {"description": "About", "vintage": "2024"}
        )
        metadata = write_upload_metadata(metadata, {"vintage": " "})
        self.assertEqual(
            metadata, {"metadata": {"identification": {"description": "About"}}}
        )
