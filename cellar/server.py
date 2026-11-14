"""Local web dashboard: `cellar ui`. Listens on 127.0.0.1 only and needs no extra packages."""

import json
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from cellar import __version__
from cellar.checker import InputError, check_header, header_from_text, parse_config

PAGE = Path(__file__).parent / "web" / "index.html"


def make_server(config_path, port=8765):
    config = Path(config_path)

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def send(self, code, payload, ctype="application/json"):
            data = payload if isinstance(payload, bytes) else json.dumps(payload).encode()
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def local_only(self):
            if self.headers.get("Host", "").split(":")[0] in ("127.0.0.1", "localhost"):
                return True
            self.send(403, {"error": "Local access only."})
            return False

        def do_GET(self):
            if not self.local_only():
                return
            if self.path == "/":
                html = PAGE.read_text(encoding="utf-8").replace("__VERSION__", __version__)
                return self.send(200, html.encode(), "text/html; charset=utf-8")
            if self.path == "/api/config":
                try:
                    data = json.loads(config.read_text(encoding="utf-8-sig"))
                except (OSError, ValueError):
                    data = {"integrations": []}
                return self.send(200, {"config": data, "path": config.name})
            self.send(404, {"error": "Not found."})

        def do_POST(self):
            if not self.local_only():
                return
            try:
                body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
                integrations = parse_config(body.get("config"))
                if self.path == "/api/config":
                    config.write_text(json.dumps(body["config"], indent=2) + "\n", encoding="utf-8")
                    return self.send(200, {"saved": config.name})
                if self.path == "/api/check":
                    header = header_from_text(body.get("csv", ""))
                    results = check_header(header, integrations)
                    return self.send(200, {"header": header, "results": [
                        {"id": r.integration, "passed": r.passed, "missing": list(r.missing)} for r in results]})
                self.send(404, {"error": "Not found."})
            except (InputError, ValueError) as exc:
                self.send(400, {"error": str(exc)})

    return ThreadingHTTPServer(("127.0.0.1", port), Handler)


def serve(config_path, port=8765, open_browser=True):
    try:
        server = make_server(config_path, port)
    except OSError:
        print(f"ERROR  Port {port} is busy. Try: cellar ui --port {port + 1}")
        return 2
    url = f"http://127.0.0.1:{port}"
    print(f"Cellar dashboard running at {url}  (press Ctrl+C to stop)")
    if open_browser:
        threading.Timer(0.6, webbrowser.open, args=(url,)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    return 0
