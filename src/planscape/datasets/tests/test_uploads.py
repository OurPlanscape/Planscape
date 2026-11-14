import shutil
from datetime import timedelta
from pathlib import Path
from unittest import mock

from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase
from workspaces.tests.factories import (
    PlanningWorkspaceFactory,
    UserAccessWorkspaceFactory,
)
from workspaces.models import WorkspaceRole

from datasets.models import DataLayer, DataLayerStatus, DataLayerType, Dataset
from datasets.services import (
    UPLOADED_DATASET_NAME,
    create_workspace_upload,
    expire_stale_uploads,
    get_or_create_workspace_upload_dataset,
)
from datasets.tasks import process_uploaded_datalayer
from datasets.tests.factories import DataLayerFactory
from planscape.tests.factories import UserFactory

ASSETS = Path(__file__).parent / "assets"
BUCKET = "test-bucket"
SESSION = {"url": "https://storage.googleapis.com/upload/session"}


def make_upload(workspace, status=DataLayerStatus.PENDING, **kwargs):
    dataset = get_or_create_workspace_upload_dataset(workspace, workspace.created_by)
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
        self.assertEqual(datalayer.workspace, self.workspace)
        self.assertEqual(datalayer.dataset.workspace, self.workspace)
        self.assertEqual(datalayer.dataset.name, UPLOADED_DATASET_NAME)
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
        self.client.post(
            self.url, {**self.payload, "name": "Other"}, format="json"
        )
        self.assertEqual(Dataset.objects.filter(workspace=self.workspace).count(), 1)

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
        bucket, key = (object_url or self.datalayer.raw_url).removeprefix(
            "gs://"
        ).split("/", 1)
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
