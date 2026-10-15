from channels.routing import ProtocolTypeRouter
from django.test import SimpleTestCase


class AsgiApplicationTest(SimpleTestCase):
    def test_routes_http_and_websocket(self):
        from planscape.asgi import application

        self.assertIsInstance(application, ProtocolTypeRouter)
        self.assertIn("http", application.application_mapping)
        self.assertIn("websocket", application.application_mapping)
