import unittest
from unittest.mock import patch
from utils.frontend import get_frontend_url


class TestGetFrontendUrl(unittest.TestCase):
    @patch("utils.frontend.get_base_url")
    def test_get_frontend_url_no_query_params(self, mock_get_base_url):
        mock_get_base_url.return_value = "http://localhost:8000"
        url = "test"
        expected = "http://localhost:8000/test"
        self.assertEqual(get_frontend_url(url), expected)

    @patch("utils.frontend.get_base_url")
    def test_get_frontend_url_with_query_params(self, mock_get_base_url):
        mock_get_base_url.return_value = "http://localhost:8000"
        url = "test"
        query_params = {"param1": "value1", "param2": "plan/1"}
        expected = "http://localhost:8000/test?param1=value1&param2=plan%2F1"
        self.assertEqual(get_frontend_url(url, query_params), expected)

    def test_get_frontend_url_with_leading_slash(self):
        url = "/test"
        with self.assertRaises(ValueError):
            get_frontend_url(url)
