"""Local dev server: serves the app and persists state to the data/ folder."""

from __future__ import annotations

import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from storage import load_full_state, save_full_state

ROOT = Path(__file__).parent
PORT = 8080


class AuraAttendHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/state":
            payload = load_full_state()
            self._send_json(payload or {})
            return
        if path in ("/", "/index.html"):
            self._serve_index_html()
            return
        return super().do_GET()

    def _serve_index_html(self) -> None:
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        inject = '<script>window.__STORAGE_API__ = "/api/state";</script>\n'
        file_state = load_full_state()
        if file_state:
            inject += (
                f"<script>window.__INITIAL_STATE__ = {json.dumps(file_state)};"
                f"window.__INITIAL_STATE_UPDATED__ = Date.now();</script>\n"
            )
        html = html.replace("</head>", inject + "</head>")
        encoded = html.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path != "/api/state":
            self.send_error(404)
            return

        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        try:
            state = json.loads(body.decode("utf-8"))
            if not isinstance(state.get("subjects"), list) or not isinstance(state.get("timetable"), dict):
                raise ValueError("Invalid state shape")
            save_full_state(state)
            self._send_json({"ok": True})
        except (json.JSONDecodeError, ValueError) as exc:
            self._send_json({"ok": False, "error": str(exc)}, status=400)

    def log_message(self, format: str, *args) -> None:
        if "/api/state" in (args[0] if args else ""):
            return
        super().log_message(format, *args)

    def _send_json(self, payload: object, status: int = 200) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


def main() -> None:
    server = ThreadingHTTPServer(("127.0.0.1", PORT), AuraAttendHandler)
    print(f"AuraAttend running at http://127.0.0.1:{PORT}")
    print(f"Attendance data folder: {ROOT / 'data'}")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
        server.server_close()


if __name__ == "__main__":
    main()
