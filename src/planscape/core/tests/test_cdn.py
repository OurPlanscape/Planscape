from datetime import datetime, timedelta, timezone
from unittest import mock

from django.test import SimpleTestCase, override_settings

from core.cdn import (
    create_raster_cdn_url,
    get_window_expiry,
    is_raster_cdn_configured,
    sign_url,
)

CDN_SETTINGS = {
    "GCS_BUCKET": "planscape-datastore-test",
    "RASTER_CDN_BASE_URL": "https://cdn.test.planscape.org",
    "RASTER_CDN_KEY_NAME": "my-key",
    "RASTER_CDN_SIGNING_KEY": "nZtRohdNF9m3cKM24IcK4w==",
    "RASTER_CDN_URL_WINDOW_DAYS": 15,
}
WINDOW_START = datetime(2026, 11, 18, tzinfo=timezone.utc)


class SignUrlTest(SimpleTestCase):
    def test_matches_google_sample(self):
        # values from the test of Google's Cloud CDN signing sample
        signed = sign_url(
            "http://35.186.234.33/index.html",
            "my-key",
            "nZtRohdNF9m3cKM24IcK4w==",
            1549751401,
        )
        self.assertEqual(
            signed,
            "http://35.186.234.33/index.html?Expires=1549751401&KeyName=my-key"
            "&Signature=CRFqQnVfFyiUyR63OQf-HRUpIwc=",
        )

    def test_accepts_key_without_padding(self):
        padded = sign_url("https://a/b.tif", "k", "nZtRohdNF9m3cKM24IcK4w==", 1)
        unpadded = sign_url("https://a/b.tif", "k", "nZtRohdNF9m3cKM24IcK4w", 1)
        self.assertEqual(padded, unpadded)

    def test_appends_to_existing_query(self):
        signed = sign_url("https://a/b.tif?x=1", "k", "nZtRohdNF9m3cKM24IcK4w==", 1)
        self.assertIn("b.tif?x=1&Expires=1&KeyName=k&Signature=", signed)


@override_settings(**CDN_SETTINGS)
class WindowExpiryTest(SimpleTestCase):
    def test_same_expiry_inside_window(self):
        # 2026-11-18 is day 20775 since the epoch, a multiple of 15
        end = WINDOW_START + timedelta(days=15, seconds=-1)
        self.assertEqual(get_window_expiry(WINDOW_START), get_window_expiry(end))

    def test_expiry_is_window_end_plus_grace(self):
        expected = WINDOW_START + timedelta(days=16)
        self.assertEqual(get_window_expiry(WINDOW_START), int(expected.timestamp()))

    def test_expiry_changes_in_next_window(self):
        next_window = WINDOW_START + timedelta(days=15)
        self.assertEqual(
            get_window_expiry(next_window) - get_window_expiry(WINDOW_START),
            15 * 86400,
        )


@override_settings(**CDN_SETTINGS)
class CreateRasterCdnUrlTest(SimpleTestCase):
    def test_signs_datalayer_url(self):
        url = create_raster_cdn_url(
            "gs://planscape-datastore-test/datalayers/1/some file.tif"
        )
        self.assertTrue(
            url.startswith(
                "https://cdn.test.planscape.org/datalayers/1/some%20file.tif?Expires="
            )
        )
        self.assertIn("&KeyName=my-key&Signature=", url)

    def test_url_is_stable_inside_window(self):
        gs_url = "gs://planscape-datastore-test/datalayers/1/a.tif"
        with mock.patch("core.cdn.get_window_expiry", return_value=1800000000):
            self.assertEqual(
                create_raster_cdn_url(gs_url), create_raster_cdn_url(gs_url)
            )

    def test_other_bucket_returns_none(self):
        self.assertIsNone(create_raster_cdn_url("gs://other/datalayers/1/a.tif"))

    def test_outside_datalayers_returns_none(self):
        self.assertIsNone(
            create_raster_cdn_url("gs://planscape-datastore-test/credentials/key.json")
        )

    def test_is_configured(self):
        self.assertTrue(is_raster_cdn_configured())
        with override_settings(RASTER_CDN_SIGNING_KEY=None):
            self.assertFalse(is_raster_cdn_configured())
