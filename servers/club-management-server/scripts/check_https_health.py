"""Container healthcheck: calls the BFF's own /health with its certificate, keeping mTLS on.

Usage: python check_https_health.py <certificate name>
"""

import socket
import ssl
import sys

PORT = 8000
TIMEOUT_SECONDS = 4


def main() -> int:
    name = sys.argv[1]
    context = ssl.create_default_context(cafile="/certs/ca.crt")
    context.load_cert_chain("/certs/tls.crt", "/certs/tls.key")
    try:
        with socket.create_connection(("127.0.0.1", PORT), TIMEOUT_SECONDS) as raw:
            with context.wrap_socket(raw, server_hostname=name) as connection:
                connection.sendall(
                    f"GET /health HTTP/1.1\r\nHost: {name}\r\nConnection: close\r\n\r\n".encode()
                )
                status_line = connection.recv(64).decode(errors="replace")
    except OSError:
        return 1
    return 0 if status_line.split(" ")[1:2] == ["200"] else 1


if __name__ == "__main__":
    sys.exit(main())
