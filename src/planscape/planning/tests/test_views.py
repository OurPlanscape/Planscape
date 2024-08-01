import json
from planning.models import UserPrefs
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase, APITransactionTestCase

from planning.tests.test_geometry import read_shapefile, to_geometry


class ValidatePlanningAreaTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create(username="testuser")
        self.user.set_password("12345")
        self.user.save()
        self.valid_pa = {
            "type": "Polygon",
            "coordinates": [
                [
                    [0, 0],
                    [0, 1],
                    [1, 1],
                    [1, 0],
                    [0, 0],
                ],
            ],
        }
        self.invalid_pa = {
            "type": "Polygon",
            "coordinates": [
                [
                    [-46.01299715793388, -18.545559916237735],
                    [-45.43418235211229, -18.296994989031617],
                    [-46.02213633907763, -18.99263980743585],
                    [-45.34888332809618, -18.534006734887157],
                    [-46.01299715793388, -18.545559916237735],
                ]
            ],
        }
        with read_shapefile("planning/tests/test_data/self-intersection.shp") as col:
            self.self_intersection = json.loads(to_geometry(col[0].geometry).json)

    def test_validate_planning_area_returns_area_acres(self):
        self.client.force_authenticate(self.user)
        payload = {"geometry": self.valid_pa}
        response = self.client.post(
            reverse("planning:validate_planning_area"), data=payload, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("area_acres", response.json())

    def test_validate_planning_area_invalid_pa_fixes_pa(self):
        self.client.force_authenticate(self.user)
        payload = {"geometry": self.invalid_pa}
        response = self.client.post(
            reverse("planning:validate_planning_area"), data=payload, format="json"
        )
        self.assertEqual(response.status_code, 200)

    def test_validate_planning_area_fails(self):
        self.client.force_authenticate(self.user)
        payload = {"geometry": self.self_intersection}
        response = self.client.post(
            reverse("planning:validate_planning_area"), data=payload, format="json"
        )
        self.assertEqual(response.status_code, 400)


class CreateSharedLinkTest(APITransactionTestCase):
    def setUp(self):
        self.user = User.objects.create(username="testuser")
        self.user.set_password("12345")
        self.user.save()

    def test_create_shared_link(self):
        view_state = {
            "page_attributes": ["a", "b", "c", "d"],
            "control_values": [
                {"question1": "yes"},
                {"question2": "no"},
                {"question3": "maybe"},
            ],
            "long": "-100.00",
            "lat": "-100.01",
            "zoom": "+500",
        }
        view_json = json.dumps(view_state)
        self.client.force_authenticate(self.user)
        # generate the new link with a 'view-state'
        payload = json.dumps({"view_state": view_json})
        response = self.client.post(
            reverse("planning:create_shared_link"),
            payload,
            content_type="application/json",
        )
        json_response = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            json_response["link_code"].isalnum(), "Returned string is not alphanumeric"
        )
        self.assertEqual(json_response["user_id"], self.user.pk)

    def test_create_shared_link_without_auth(self):
        view_state = {
            "page_attributes": ["x", "y", "z", "1"],
            "control_values": [
                {"question1": "ok"},
                {"question2": "sure"},
                {"question3": "yes"},
            ],
            "long": "-200.00",
            "lat": "-200.01",
            "zoom": "+1",
        }
        view_json = json.dumps(view_state)
        # generate the new link with a 'view-state'
        payload = json.dumps({"view_state": view_json})
        response = self.client.post(
            reverse("planning:create_shared_link"),
            payload,
            content_type="application/json",
        )
        json_response = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            json_response["link_code"].isalnum(), "Returned string is not alphanumeric"
        )
        self.assertEqual(json_response["user_id"], None)

    def test_getting_new_link(self):
        view_state = {
            "page_attributes": ["a", "b", "c", "d"],
            "control_values": [
                {"question1": "yes"},
                {"question2": "no"},
                {"question3": "maybe"},
            ],
            "long": "-100.00",
            "lat": "-100.01",
            "zoom": "+500",
        }
        view_json = json.dumps(view_state)
        self.client.force_authenticate(self.user)
        # generate the new link with a 'view-state'
        payload = json.dumps({"view_state": view_json})
        response = self.client.post(
            reverse("planning:create_shared_link"),
            payload,
            content_type="application/json",
        )
        # then fetch the data with the new url
        json_response = json.loads(response.content)
        link_code = json_response["link_code"]
        shared_link_response = self.client.get(
            reverse("planning:get_shared_link", kwargs={"link_code": link_code}),
            content_type="application/json",
        )
        json_get_response = json.loads(shared_link_response.content)
        self.assertEqual(shared_link_response.status_code, 200)
        self.assertJSONEqual(json_get_response["view_state"], view_state)

    def test_getting_link_created_by_unauthd_user(self):
        view_state = {
            "page_attributes": ["w", "x", "y", "z"],
            "control_values": [
                {"question1": "hella"},
                {"question2": "hola"},
                {"question3": "olá"},
            ],
            "long": "-60.00",
            "lat": "-60.01",
            "zoom": "+300",
        }
        view_json = json.dumps(view_state)
        # generate the new link with a 'view-state'
        payload = json.dumps({"view_state": view_json})
        response = self.client.post(
            reverse("planning:create_shared_link"),
            payload,
            content_type="application/json",
        )
        json_response = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        link_code = json_response["link_code"]

        # then fetch the data with the new url
        shared_link_response = self.client.get(
            reverse("planning:get_shared_link", kwargs={"link_code": link_code}),
            content_type="application/json",
        )
        json_get_response = json.loads(shared_link_response.content)
        self.assertEqual(shared_link_response.status_code, 200)
        self.assertJSONEqual(json_get_response["view_state"], view_state)

    def test_retrieving_bad_link(self):
        # then fetch the data with a bad link code
        shared_link_response = self.client.get(
            reverse("planning:get_shared_link", kwargs={"link_code": "madeuplink"}),
            content_type="application/json",
        )
        self.assertEqual(shared_link_response.status_code, 404)


class UserPrefsViewTest(APITransactionTestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="12345")
        self.userpref = UserPrefs.objects.create(
            user=self.user,
            preferences={
                "hello": "is it me you're looking for",
                "what": "what is this",
            },
        )

    def test_getting_user_prefs(self):
        self.client.force_authenticate(self.user)
        user_prefs_response = self.client.get(
            reverse("planning:get_userprefs"),
            content_type="application/json",
        )
        response_data = json.loads(user_prefs_response.content)
        self.assertEqual(
            "is it me you're looking for",
            response_data["preferences"]["hello"],
        )
        self.assertEqual(
            "what is this",
            response_data["preferences"]["what"],
        )

    def test_adding_a_value_ignoring_others(self):
        self.client.force_authenticate(self.user)
        payload = json.dumps({"show_delete_note_warning": False})
        user_prefs_response = self.client.patch(
            reverse("planning:get_userprefs"),
            payload,
            content_type="application/json",
        )

        self.assertEqual(200, user_prefs_response.status_code)

        # and now we get the user prefs again
        user_prefs_response = self.client.get(
            reverse("planning:get_userprefs"),
            content_type="application/json",
        )
        response_data = json.loads(user_prefs_response.content)
        self.assertEqual(
            "is it me you're looking for",
            response_data["preferences"]["hello"],
        )
        self.assertEqual(
            "what is this",
            response_data["preferences"]["what"],
        )
        self.assertEqual(
            False,
            response_data["preferences"]["show_delete_note_warning"],
        )

    def test_updating_an_existing_value(self):
        self.client.force_authenticate(self.user)
        payload = json.dumps({"hello": "I just called to say...hello"})
        user_prefs_response = self.client.patch(
            reverse("planning:get_userprefs"),
            payload,
            content_type="application/json",
        )

        self.assertEqual(200, user_prefs_response.status_code)

        # and now we get the user prefs again
        user_prefs_response = self.client.get(
            reverse("planning:get_userprefs"),
            content_type="application/json",
        )
        response_data = json.loads(user_prefs_response.content)
        self.assertEqual(
            "I just called to say...hello",
            response_data["preferences"]["hello"],
        )
        self.assertEqual(
            "what is this",
            response_data["preferences"]["what"],
        )

    def test_updating_one_value_and_adding_another(self):
        self.client.force_authenticate(self.user)
        payload = json.dumps(
            {
                "hello": "Is a friendly greeting",
                "goodbye": "Goodbye is not hello.",
            }
        )
        user_prefs_response = self.client.patch(
            reverse("planning:get_userprefs"),
            payload,
            content_type="application/json",
        )

        self.assertEqual(200, user_prefs_response.status_code)

        # and now we get the user prefs again
        user_prefs_response = self.client.get(
            reverse("planning:get_userprefs"),
            content_type="application/json",
        )
        response_data = json.loads(user_prefs_response.content)
        self.assertEqual(
            "Is a friendly greeting",
            response_data["preferences"]["hello"],
        )
        self.assertEqual(
            "what is this",
            response_data["preferences"]["what"],
        )
        self.assertEqual(
            "Goodbye is not hello.",
            response_data["preferences"]["goodbye"],
        )

    def test_deleting_an_attribute(self):
        self.client.force_authenticate(self.user)
        user_prefs_response = self.client.delete(
            reverse(
                "planning:delete_userprefs",
                kwargs={"preference_key": "hello"},
            ),
            content_type="application/json",
        )

        self.assertEqual(200, user_prefs_response.status_code)

        # and now we get the user prefs again
        user_prefs_response = self.client.get(
            reverse("planning:get_userprefs"),
            content_type="application/json",
        )
        response_data = json.loads(user_prefs_response.content)
        self.assertNotIn("hello", response_data["preferences"])
        self.assertEqual(
            "what is this",
            response_data["preferences"]["what"],
        )

    def test_deleting_nonexistent_attribute(self):
        self.client.force_authenticate(self.user)
        user_prefs_response = self.client.delete(
            reverse(
                "planning:delete_userprefs",
                kwargs={"preference_key": "this_doesnt_exist"},
            ),
            content_type="application/json",
        )

        self.assertEqual(200, user_prefs_response.status_code)

        # and now we get the user prefs again
        user_prefs_response = self.client.get(
            reverse("planning:get_userprefs"),
            content_type="application/json",
        )
        response_data = json.loads(user_prefs_response.content)
        self.assertNotIn("this_doesnt_exist", response_data["preferences"])
        self.assertEqual(
            "what is this",
            response_data["preferences"]["what"],
        )
        self.assertEqual(
            "is it me you're looking for",
            response_data["preferences"]["hello"],
        )


class EmptyUserPrefsAPIViewTest(APITransactionTestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="12345")

    def test_getting_empty_user_prefs(self):
        self.client.force_authenticate(self.user)
        user_prefs_response = self.client.get(
            reverse("planning:get_userprefs"),
            content_type="application/json",
        )

        response_data = json.loads(user_prefs_response.content)
        self.assertIsNone(
            response_data["preferences"],
        )

    def test_updating_an_empty_userpref(self):
        self.client.force_authenticate(self.user)
        payload = json.dumps({"hello": "I just called to say...hello"})
        user_prefs_response = self.client.patch(
            reverse("planning:get_userprefs"),
            payload,
            content_type="application/json",
        )

        self.assertEqual(200, user_prefs_response.status_code)

        # and now we get the user prefs again
        user_prefs_response = self.client.get(
            reverse("planning:get_userprefs"),
            content_type="application/json",
        )
        response_data = json.loads(user_prefs_response.content)
        self.assertEqual(
            "I just called to say...hello",
            response_data["preferences"]["hello"],
        )

    def test_deleting_from_empty_userpref(self):
        self.client.force_authenticate(self.user)
        user_prefs_response = self.client.delete(
            reverse(
                "planning:delete_userprefs",
                kwargs={"preference_key": "hello"},
            ),
            content_type="application/json",
        )

        self.assertEqual(200, user_prefs_response.status_code)

        # and now we get the user prefs again
        user_prefs_response = self.client.get(
            reverse("planning:get_userprefs"),
            content_type="application/json",
        )
        response_data = json.loads(user_prefs_response.content)
        self.assertIsNone(
            response_data["preferences"],
        )
