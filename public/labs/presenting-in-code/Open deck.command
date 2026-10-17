#!/bin/sh
cd "$(dirname "$0")" || exit 1
exec python3 - <<'PYTHON'
import http.server
import webbrowser
server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), http.server.SimpleHTTPRequestHandler)
url = f"http://127.0.0.1:{server.server_port}/deck/#making-of?slide=1"
print(f"Presentations in code: {url}\nKeep this window open. Press Control-C to stop.", flush=True)
webbrowser.open(url)
try:
    server.serve_forever()
except KeyboardInterrupt:
    server.server_close()
PYTHON
