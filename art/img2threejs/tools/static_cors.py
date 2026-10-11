"""Static file server with CORS for localhost pages (serves one directory)."""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
class H(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*'); super().end_headers()
    def log_message(self, *a): pass
ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), partial(H, directory=sys.argv[1])).serve_forever()
