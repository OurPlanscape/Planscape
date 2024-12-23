import json

from django.conf import settings
from django.test import TestCase
from unittest import mock

from core.analytics import collect_metric, _async_collect_metric


class AnalyticsTest(TestCase):
    def setUp(self):
        settings.ANALYTICS_ENABLED = True
        settings.FIREBASE_APP_ID = "test_app_id"
        settings.FIREBASE_APP_INSTANCE_ID = "test_app_instance_id"
        settings.FIREBASE_API_SECRET = "test_api_secret"
        settings.ANALYTICS_DEBUG_MODE = False

    @mock.patch(
        "core.analytics._async_collect_metric.delay",
    )
    def test_collect_metric(self, async_collect_metric):
        collect_metric("test_event", success=True, execution_time=5)

        async_collect_metric.assert_called_once_with(
            "test_event", mock.ANY, {"success": True, "execution_time": 5}
        )

    @mock.patch(
        "core.analytics.requests",
        return_value=mock.Mock(post=mock.Mock()),
    )
    def test_async_collect_metric(self, requests):
        _async_collect_metric(
            "test_event", 123456, {"success": True, "execution_time": 5}
        )

        url = (
            "https://www.google-analytics.com/mp/collect?"
            "firebase_app_id=test_app_id"
            "&api_secret=test_api_secret"
        )
        payload = {
            "app_instance_id": "test_app_instance_id",
            "timestamp_micros": 123456,
            "events": [
                {
                    "name": "test_event",
                    "params": {
                        "success": True,
                        "execution_time": 5,
                    },
                }
            ],
        }

        requests.post.assert_called_once_with(
            url, json=json.dumps(payload), verify=True
        )
