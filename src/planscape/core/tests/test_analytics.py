import json

from django.conf import settings
from django.test import TestCase
from unittest import mock

from core.analytics import track_metric, _async_track_metric


class AnalyticsTest(TestCase):
    def setUp(self):
        settings.ANALYTICS_ENABLED = True
        settings.GA_TRACKING_ID = "test_tracking_id"
        settings.GA_CLIENT_ID = "test_client_id"

    @mock.patch(
        "core.analytics._async_track_metric.delay",
    )
    def test_track_metric(self, async_track_metric):
        track_metric("test_event", success=True, execution_time=5)

        async_track_metric.assert_called_once_with(
            "test_event", mock.ANY, {"success": True, "execution_time": 5}
        )

    @mock.patch(
        "core.analytics.Tracker", return_value=mock.Mock(track_event=mock.Mock())
    )
    def test_async_track_metric(self, tracker_mock):
        _async_track_metric(
            "test_event", 123456, {"success": True, "execution_time": 5}
        )

        tracker_mock.return_value.track_event.assert_called_once()
