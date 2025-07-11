import json
import subprocess
from http.server import HTTPServer, BaseHTTPRequestHandler
from decouple import Config, RepositoryEnv

config = Config(RepositoryEnv("../../.env"))

FORSYS_PATCHMAX_SCRIPT = config("FORSYS_PATCHMAX_SCRIPT", cast=str, default=None)

if not FORSYS_PATCHMAX_SCRIPT:
    raise ValueError("FORSYS_PATCHMAX_SCRIPT must be set in .env file")


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/ping":
            self.send_response(200)
            self.send_header("Content-type", "text/plain")
            self.end_headers()
            self.wfile.write(b"Pong")
        else:
            self.send_error(404, "File not found")

    def do_POST(self):
        if self.path == "/run_forsys":
            content_len = int(self.headers.get("Content-Length", 0))
            post_body = self.rfile.read(content_len)
            try:
                json_data = json.loads(post_body.decode("utf-8"))
                scenario_id = json_data.get("scenario_id")
            except json.JSONDecodeError:
                self.send_error(400, "Invalid JSON")
                return
            if not scenario_id:
                self.send_error(400, "Missing scenario_id")
                return
            self._run_forsys(scenario_id)
        else:
            self.send_error(404, "File not found")

    def _run_forsys(self, scenario_id):
        forsys_cmd = [
            "nohup",
            "Rscript",
            str(FORSYS_PATCHMAX_SCRIPT),
            "--scenario",
            str(scenario_id),
            "&"
        ]
        try:
            self.log_message("command: %s", self.path)
            subprocess.run(
                forsys_cmd,
                shell=True,
                check=True,
            )
        except Exception as e:
            self.send_error(500, f"Error running Forsys: {str(e)}")


if __name__ == "__main__":
    HTTPServer(("127.0.0.1", 4242), Handler).serve_forever()
