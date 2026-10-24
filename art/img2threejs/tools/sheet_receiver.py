"""Tiny local receiver: the sprite tool page POSTs {name, dataUrl, meta}; we save PNG + JSON."""
import base64
import json
import os
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        origin = self.headers.get("Origin") or ""
        self.send_header("Access-Control-Allow-Origin", origin if origin.startswith("http://localhost:") else "http://localhost:3100")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        name = "".join(c for c in body["name"] if c.isalnum() or c in "-_")
        png = base64.b64decode(body["dataUrl"].split(",", 1)[1])
        with open(os.path.join(OUT, f"{name}.png"), "wb") as f:
            f.write(png)
        with open(os.path.join(OUT, f"{name}.json"), "w") as f:
            json.dump(body["meta"], f)
        self.send_response(200)
        self._cors()
        self.end_headers()
        self.wfile.write(json.dumps({"saved": name, "bytes": len(png)}).encode())

    def log_message(self, *args):
        pass


HTTPServer(("127.0.0.1", 8765), Handler).serve_forever()
