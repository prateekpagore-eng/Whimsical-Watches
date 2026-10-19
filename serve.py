"""Local dev server that tells the browser never to cache, so edits always show on refresh."""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
print(f"Serving on http://localhost:{port}")
ThreadingHTTPServer(("", port), NoCacheHandler).serve_forever()
