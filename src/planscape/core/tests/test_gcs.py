from unittest import mock

from django.test import SimpleTestCase

from core.gcs import copy_file


class CopyFileTest(SimpleTestCase):
    @mock.patch("core.gcs.storage.Client")
    def test_rewrites_until_complete(self, client):
        destination = mock.Mock()
        destination.rewrite.side_effect = [("token-1", 10, 20), (None, 20, 20)]
        source = mock.Mock()
        buckets = {
            "burn-output": mock.Mock(**{"blob.return_value": source}),
            "planscape": mock.Mock(**{"blob.return_value": destination}),
        }
        client.return_value.bucket.side_effect = buckets.__getitem__

        copy_file(
            "gs://burn-output/job/output.tif", "gs://planscape/datalayers/1/a.tif"
        )

        buckets["burn-output"].blob.assert_called_once_with("job/output.tif")
        buckets["planscape"].blob.assert_called_once_with("datalayers/1/a.tif")
        self.assertEqual(
            destination.rewrite.call_args_list,
            [mock.call(source), mock.call(source, token="token-1")],
        )

    @mock.patch("core.gcs.storage.Client")
    def test_rejects_non_gcs_urls(self, client):
        with self.assertRaises(ValueError):
            copy_file("s3://bucket/output.tif", "gs://planscape/a.tif")
        with self.assertRaises(ValueError):
            copy_file("gs://bucket/output.tif", "/tmp/a.tif")
        client.assert_not_called()
