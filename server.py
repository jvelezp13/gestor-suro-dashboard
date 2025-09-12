#!/usr/bin/env python3
import http.server
import ssl
import socketserver
import os

PORT = 8443
Handler = http.server.SimpleHTTPRequestHandler

print(f"Serving HTTPS on port {PORT}")
print(f"Access your app at: https://localhost:{PORT}")
print("(You'll need to accept the self-signed certificate warning)")

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain("cert.pem", "key.pem")
    httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
    httpd.serve_forever()