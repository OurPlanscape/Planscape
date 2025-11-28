import shlex
import subprocess
import sys
import signal
import os
import tempfile
from pathlib import Path

from django.core.management.base import BaseCommand
from django.utils import autoreload


# PID file to track celery worker across restarts. Each restart kills the previous worker.
PID_FILE = Path(tempfile.gettempdir()) / "celery_autoreload.pid"


def kill_previous_worker():
    """Kill the previous celery worker using the PID file."""
    if PID_FILE.exists():
        try:
            pid = int(PID_FILE.read_text().strip())
            print(f"Found previous celery worker with PID {pid}")
            try:
                os.kill(pid, signal.SIGTERM)
                print(f"Sent SIGTERM to process {pid}")

                import time

                for i in range(10):
                    try:
                        result = os.waitpid(pid, os.WNOHANG)
                        if result != 0:
                            print(f"Process {pid} terminated successfully")
                            break
                    except ChildProcessError:
                        try:
                            os.kill(pid, 0)
                        except ProcessLookupError:
                            print(f"Process {pid} no longer exists")
                            break
                    time.sleep(0.5)
                else:
                    try:
                        os.kill(pid, 0)  # Check if still running
                        print(
                            f"Process {pid} still running after SIGTERM, sending SIGKILL"
                        )
                        os.kill(pid, signal.SIGKILL)
                        time.sleep(0.5)
                        try:
                            os.waitpid(pid, os.WNOHANG)
                        except (ChildProcessError, ProcessLookupError):
                            pass
                    except ProcessLookupError:
                        print(f"Process {pid} terminated")

            except ProcessLookupError:
                print(f"Process {pid} not found (already terminated)")
        except (ValueError, FileNotFoundError) as e:
            print(f"Could not read PID file: {e}")
        finally:
            try:
                PID_FILE.unlink()
            except FileNotFoundError:
                pass


def auto_reload_celery(*args, **kwargs):
    # Kill existing celery worker from previous run
    kill_previous_worker()

    start_worker_cmd = (
        "celery -A planscape worker -E --loglevel INFO --concurrency 3 "
        "-Q forsys,default,impacts,geopackage,planning-stand-creation,planning-stand-metrics"
    )
    print("Starting celery worker...")
    process = subprocess.Popen(shlex.split(start_worker_cmd))
    print(f"Celery worker started with PID {process.pid}")

    PID_FILE.write_text(str(process.pid))

    try:
        process.wait()
    except KeyboardInterrupt:
        print("\nReceived interrupt, stopping celery worker...")
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()
        if PID_FILE.exists():
            PID_FILE.unlink()


class Command(BaseCommand):
    help = "Start Celery worker with auto-reload on code changes (for development)"

    def handle(self, *args, **options):
        self.stdout.write("Starting celery worker with autoreload...")
        autoreload.run_with_reloader(auto_reload_celery)
