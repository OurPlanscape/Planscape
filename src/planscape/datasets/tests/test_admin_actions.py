from unittest import mock

from django.contrib.admin.sites import AdminSite
from django.test import RequestFactory, TestCase

from datasets.admin import DataLayerAdmin
from datasets.models import DataLayer
from datasets.tests.factories import DataLayerFactory
from planscape.tests.factories import UserFactory


class TestDataLayerAdminActions(TestCase):
    def setUp(self) -> None:
        self.factory = RequestFactory()
        self.admin_user = UserFactory.create(is_staff=True, is_superuser=True)
        self.admin_site = AdminSite()
        self.admin = DataLayerAdmin(DataLayer, self.admin_site)

    def test_calculate_outline_queues_task_for_selected_datalayers(self):
        datalayer_one = DataLayerFactory.create()
        datalayer_two = DataLayerFactory.create()
        request = self.factory.post("/")
        request.user = self.admin_user
        queryset = DataLayer.objects.filter(id__in=[datalayer_one.id, datalayer_two.id])

        with (
            mock.patch("datasets.admin.calculate_datalayer_outline.delay") as delay_mock,
            mock.patch.object(DataLayerAdmin, "message_user") as message_mock,
        ):
            self.admin.calculate_outline(request, queryset)

        called_ids = {call.args[0] for call in delay_mock.call_args_list}
        self.assertSetEqual(called_ids, {datalayer_one.id, datalayer_two.id})
        message_mock.assert_called_once_with(
            request,
            "Queued outline calculation for 2 datalayers.",
        )

    def test_calculate_outline_handles_empty_queryset(self):
        request = self.factory.post("/")
        request.user = self.admin_user
        queryset = DataLayer.objects.none()

        with (
            mock.patch("datasets.admin.calculate_datalayer_outline.delay") as delay_mock,
            mock.patch.object(DataLayerAdmin, "message_user") as message_mock,
        ):
            self.admin.calculate_outline(request, queryset)

        delay_mock.assert_not_called()
        message_mock.assert_called_once_with(
            request,
            "Queued outline calculation for 0 datalayers.",
        )
