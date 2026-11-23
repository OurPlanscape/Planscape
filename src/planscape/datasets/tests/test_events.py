from unittest import mock

from django.test import TestCase
from workspaces.tests.factories import PlanningWorkspaceFactory

from datasets.models import DataLayerStatus, VisibilityOptions
from datasets.services import add_favorite_datalayer, remove_favorite_datalayer
from datasets.tests.factories import DataLayerFactory, DatasetFactory


@mock.patch("realtime.events._send")
class FavoriteDataLayerEventsTest(TestCase):
    def setUp(self):
        self.workspace = PlanningWorkspaceFactory.create()
        self.user = self.workspace.created_by
        self.datalayer = DataLayerFactory.create(
            dataset=DatasetFactory.create(visibility=VisibilityOptions.PUBLIC),
            status=DataLayerStatus.READY,
        )

    def published(self, send):
        return [call.args[0] for call in send.call_args_list]

    def test_favorite_sends_the_datalayer(self, send):
        with self.captureOnCommitCallbacks(execute=True):
            add_favorite_datalayer(self.user, self.workspace, self.datalayer)

        (event,) = self.published(send)
        self.assertEqual(event["type"], "datasets.datalayer.favorited")
        self.assertEqual(event["workspace_id"], self.workspace.pk)
        self.assertEqual(
            event["object"], {"kind": "datalayer", "id": self.datalayer.pk}
        )
        self.assertEqual(event["data"]["id"], self.datalayer.pk)
        self.assertEqual(event["data"]["name"], self.datalayer.name)
        self.assertIs(event["data"]["is_favorite"], True)
        self.assertEqual(event["actor_id"], self.user.pk)

    def test_favoriting_again_sends_nothing(self, send):
        add_favorite_datalayer(self.user, self.workspace, self.datalayer)
        send.reset_mock()

        with self.captureOnCommitCallbacks(execute=True):
            add_favorite_datalayer(self.user, self.workspace, self.datalayer)

        self.assertEqual(self.published(send), [])

    def test_unfavorite_sends_only_the_id(self, send):
        add_favorite_datalayer(self.user, self.workspace, self.datalayer)
        send.reset_mock()

        with self.captureOnCommitCallbacks(execute=True):
            remove_favorite_datalayer(self.user, self.workspace, self.datalayer.pk)

        (event,) = self.published(send)
        self.assertEqual(event["type"], "datasets.datalayer.unfavorited")
        self.assertEqual(
            event["object"], {"kind": "datalayer", "id": self.datalayer.pk}
        )
        self.assertEqual(event["data"], {})
