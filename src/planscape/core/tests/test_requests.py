import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

from django.test import SimpleTestCase, override_settings

from core.requests import RequestSessionWrap


def run_test_server(statuses):
    class RetryTestHandler(BaseHTTPRequestHandler):
        attempts = 0
        methods = []

        def do_GET(self):
            self.handle_request()

        def do_POST(self):
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length:
                self.rfile.read(content_length)
            self.handle_request()

        def handle_request(self):
            type(self).attempts += 1
            type(self).methods.append(self.command)
            status = statuses[type(self).attempts - 1]
            self.send_response(status)
            self.send_header("Content-Length", "0")
            self.end_headers()

        def log_message(self, *_args):
            pass

    server = HTTPServer(("127.0.0.1", 0), RetryTestHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    return server, thread, RetryTestHandler


@override_settings(REQUESTS_RETRIES=2, REQUESTS_BACKOFF_FACTOR=0)
class RequestSessionWrapTest(SimpleTestCase):
    def tearDown(self):
        if hasattr(self, "server"):
            self.server.shutdown()
            self.server.server_close()
            self.thread.join(timeout=1)

    def start_server(self, statuses):
        self.server, self.thread, handler = run_test_server(statuses)
        return f"http://127.0.0.1:{self.server.server_port}/test", handler

    def test_retries_get_for_status_forcelist_response(self):
        url, handler = self.start_server([500, 500, 200])

        response = RequestSessionWrap().get(url, timeout=2)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(handler.attempts, 3)
        self.assertEqual(handler.methods, ["GET", "GET", "GET"])

    def test_retries_post_for_status_forcelist_response(self):
        url, handler = self.start_server([500, 500, 200])

        response = RequestSessionWrap().post(url, json={"test": True}, timeout=2)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(handler.attempts, 3)
        self.assertEqual(handler.methods, ["POST", "POST", "POST"])
