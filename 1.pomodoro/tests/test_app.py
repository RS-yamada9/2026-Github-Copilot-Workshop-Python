from __future__ import annotations

import importlib.util
import io
import unittest
from pathlib import Path
from wsgiref.util import setup_testing_defaults


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
APP_PATH = REPOSITORY_ROOT / "1.pomodoro" / "app.py"

spec = importlib.util.spec_from_file_location("pomodoro_app", APP_PATH)
app_module = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(app_module)


class PomodoroAppTests(unittest.TestCase):
    def setUp(self):
        self.app = app_module.create_wsgi_app()

    def request(self, path: str):
        environ = {}
        setup_testing_defaults(environ)
        environ["PATH_INFO"] = path
        environ["wsgi.input"] = io.BytesIO()
        captured = {}

        def start_response(status, headers):
            captured["status"] = status
            captured["headers"] = dict(headers)

        body = b"".join(self.app(environ, start_response))
        return captured["status"], captured["headers"], body

    def test_root_returns_html(self):
        status, headers, body = self.request("/")
        self.assertEqual(status, "200 OK")
        self.assertIn("text/html", headers["Content-Type"])
        self.assertIn("Pomodoro Quest".encode("utf-8"), body)

    def test_health_returns_json(self):
        status, headers, body = self.request("/health")
        self.assertEqual(status, "200 OK")
        self.assertIn("application/json", headers["Content-Type"])
        self.assertEqual(body, b'{"status": "ok"}')

    def test_static_asset_is_served(self):
        status, headers, body = self.request("/static/css/main.css")
        self.assertEqual(status, "200 OK")
        self.assertIn("text/css", headers["Content-Type"])
        self.assertIn(b".timer-ring", body)

    def test_path_traversal_is_rejected(self):
        status, _, _ = self.request("/static/../app.py")
        self.assertEqual(status, "404 Not Found")


if __name__ == "__main__":
    unittest.main()
