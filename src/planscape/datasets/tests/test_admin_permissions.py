from django.contrib.admin.sites import AdminSite
from django.test import RequestFactory, TestCase, override_settings
from planscape.tests.factories import UserFactory

from datasets.admin import CategoryAdmin, DataLayerAdmin, DatasetAdmin, StyleAdmin
from datasets.models import Category, DataLayer, Dataset, Style


class TestCatalogOnlyAdminMixin(TestCase):
    """CatalogOnlyAdminMixin blocks write permissions outside the catalog ENV."""

    def setUp(self):
        self.factory = RequestFactory()
        self.superuser = UserFactory.create(is_staff=True, is_superuser=True)
        self.admin_site = AdminSite()

    def _request(self):
        request = self.factory.get("/")
        request.user = self.superuser
        return request

    def _admins(self):
        return [
            DataLayerAdmin(DataLayer, self.admin_site),
            DatasetAdmin(Dataset, self.admin_site),
            StyleAdmin(Style, self.admin_site),
            CategoryAdmin(Category, self.admin_site),
        ]

    @override_settings(ENV="dev")
    def test_write_permissions_blocked_outside_catalog(self):
        request = self._request()
        for admin_instance in self._admins():
            with self.subTest(admin=type(admin_instance).__name__):
                self.assertFalse(admin_instance.has_add_permission(request))
                self.assertFalse(admin_instance.has_change_permission(request))
                self.assertFalse(admin_instance.has_delete_permission(request))

    @override_settings(ENV="staging")
    def test_write_permissions_blocked_in_staging(self):
        request = self._request()
        for admin_instance in self._admins():
            with self.subTest(admin=type(admin_instance).__name__):
                self.assertFalse(admin_instance.has_add_permission(request))
                self.assertFalse(admin_instance.has_change_permission(request))
                self.assertFalse(admin_instance.has_delete_permission(request))

    @override_settings(ENV="catalog")
    def test_write_permissions_allowed_in_catalog(self):
        request = self._request()
        for admin_instance in self._admins():
            with self.subTest(admin=type(admin_instance).__name__):
                self.assertTrue(admin_instance.has_add_permission(request))
                self.assertTrue(admin_instance.has_change_permission(request))
                self.assertTrue(admin_instance.has_delete_permission(request))


class TestDataLayerAdminActionPermissions(TestCase):
    """DataLayerAdmin actions require change permission (blocks execution outside catalog)."""

    def setUp(self):
        self.admin = DataLayerAdmin(DataLayer, AdminSite())

    def test_all_actions_require_change_permission(self):
        write_actions = [
            "calculate_outline",
            "enable_forsys",
            "enable_impacts",
            "enable_map",
            "enable_climate_foresight",
        ]
        for action_name in write_actions:
            with self.subTest(action=action_name):
                action = getattr(self.admin, action_name)
                self.assertEqual(
                    list(action.allowed_permissions),
                    ["change"],
                    msg=f"{action_name} must have permissions=['change']",
                )
