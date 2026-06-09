from __future__ import annotations

import json
import mimetypes
import os
from pathlib import Path
from urllib.parse import unquote
from wsgiref.simple_server import make_server

try:
    from flask import Flask, render_template
except ImportError:  # pragma: no cover - exercised by fallback tests
    Flask = None
    render_template = None


BASE_DIR = Path(__file__).resolve().parent
TEMPLATE_DIR = BASE_DIR / "templates"
STATIC_DIR = BASE_DIR / "static"


def _response(start_response, status: str, body: bytes, content_type: str) -> list[bytes]:
    start_response(
        status,
        [
            ("Content-Type", content_type),
            ("Content-Length", str(len(body))),
        ],
    )
    return [body]


def _safe_static_path(path_info: str) -> Path | None:
    relative_path = path_info.removeprefix("/static/").lstrip("/")
    candidate = (STATIC_DIR / unquote(relative_path)).resolve()
    try:
        candidate.relative_to(STATIC_DIR.resolve())
    except ValueError:
        return None
    return candidate if candidate.is_file() else None


def create_wsgi_app():
    def application(environ, start_response):
        path_info = environ.get("PATH_INFO", "/")

        if path_info == "/":
            body = (TEMPLATE_DIR / "index.html").read_bytes()
            return _response(start_response, "200 OK", body, "text/html; charset=utf-8")

        if path_info == "/health":
            body = json.dumps({"status": "ok"}, ensure_ascii=False).encode("utf-8")
            return _response(start_response, "200 OK", body, "application/json; charset=utf-8")

        if path_info.startswith("/static/"):
            target = _safe_static_path(path_info)
            if target is None:
                return _response(
                    start_response,
                    "404 Not Found",
                    b"Not Found",
                    "text/plain; charset=utf-8",
                )

            content_type, _ = mimetypes.guess_type(target.name)
            body = target.read_bytes()
            return _response(
                start_response,
                "200 OK",
                body,
                f"{content_type or 'application/octet-stream'}; charset=utf-8",
            )

        return _response(start_response, "404 Not Found", b"Not Found", "text/plain; charset=utf-8")

    return application


def create_app():
    if Flask is None:
        return create_wsgi_app()

    app = Flask(__name__, template_folder="templates", static_folder="static")

    @app.get("/")
    def index():
        return render_template("index.html")

    @app.get("/health")
    def health():
        return {"status": "ok"}

    return app


app = create_app()


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))

    if Flask is not None and hasattr(app, "run"):
        app.run(host="0.0.0.0", port=port, debug=False)
    else:
        with make_server("0.0.0.0", port, app) as server:
            print(f"Serving Pomodoro app on http://127.0.0.1:{port}")
            server.serve_forever()
