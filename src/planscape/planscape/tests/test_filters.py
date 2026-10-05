from unittest import mock

from django.urls import reverse
from planscape.tests.factories import UserFactory
from rest_framework.test import APITestCase
from workspaces.tests.factories import PlanningWorkspaceFactory

LIST_URL = "api:workspaces:workspaces-list"
DETAIL_URL = "api:workspaces:workspaces-detail"


class TrackedFilterBackendTest(APITestCase):
    """Exercises TrackedFilterBackend through a real filterable endpoint
    (the planning Workspace list, which has a `search` filter)."""

    def setUp(self):
        self.user = UserFactory.create()
        PlanningWorkspaceFactory.create(name="Falcon", created_by=self.user)
        self.client.force_authenticate(user=self.user)

    @mock.patch("planscape.filters.track_event")
    def test_filtering_fires_a_tracked_event(self, track_event_mock):
        response = self.client.get(reverse(LIST_URL), {"search": "Fal"})

        self.assertEqual(response.status_code, 200)
        track_event_mock.assert_called_once_with(
            name="search.filtered",
            properties={
                "resource": "Workspace",
                "params": {"search": "Fal"},
                "email": self.user.email,
            },
            user_id=self.user.pk,
        )

    @mock.patch("planscape.filters.track_event")
    def test_listing_without_filter_params_does_not_track(self, track_event_mock):
        response = self.client.get(reverse(LIST_URL))

        self.assertEqual(response.status_code, 200)
        track_event_mock.assert_not_called()

    @mock.patch("planscape.filters.track_event")
    def test_blank_filter_value_does_not_track(self, track_event_mock):
        response = self.client.get(reverse(LIST_URL), {"search": ""})

        self.assertEqual(response.status_code, 200)
        track_event_mock.assert_not_called()

    @mock.patch("planscape.filters.track_event")
    def test_retrieve_does_not_track_even_with_matching_query_params(
        self, track_event_mock
    ):
        workspace = PlanningWorkspaceFactory.create(
            name="Millennium", created_by=self.user
        )
        # Note: django-filter applies filterset filtering on retrieve too
        # (via get_object() -> filter_queryset()), same as with a plain
        # DjangoFilterBackend - so the query param has to match the object
        # being retrieved or this would 404 regardless of tracking.
        response = self.client.get(
            reverse(DETAIL_URL, kwargs={"pk": workspace.pk}), {"search": "Mill"}
        )

        self.assertEqual(response.status_code, 200)
        track_event_mock.assert_not_called()
