#!/bin/sh
# Generates the private authority and one certificate per project, only if missing.
set -eu

DIR="${CERTS_DIR:-/certs}"
DAYS=825
PROJECTS="gateway client-bff admin-bff users-svc"

mkdir -p "$DIR/authority"

if [ ! -f "$DIR/authority/ca.key" ]; then
  openssl req -x509 -newkey rsa:2048 -nodes -days "$DAYS" -sha256 \
    -subj "/CN=club-management-internal-ca"     -addext "basicConstraints=critical,CA:TRUE"     -addext "keyUsage=critical,keyCertSign,cRLSign"     -addext "subjectKeyIdentifier=hash" \
    -keyout "$DIR/authority/ca.key" -out "$DIR/authority/ca.crt" 2> /dev/null
fi

for project in $PROJECTS; do
  target="$DIR/$project"
  mkdir -p "$target"
  cp "$DIR/authority/ca.crt" "$target/ca.crt"
  [ -f "$target/tls.crt" ] && continue

  extensions="$target/extensions.cnf"
  printf 'subjectAltName=DNS:%s\nextendedKeyUsage=serverAuth,clientAuth\nkeyUsage=digitalSignature,keyEncipherment\nbasicConstraints=CA:FALSE\n' \
    "$project" > "$extensions"

  openssl req -newkey rsa:2048 -nodes -subj "/CN=$project" \
    -keyout "$target/tls.key" -out "$target/tls.csr" 2> /dev/null
  openssl x509 -req -sha256 -days "$DAYS" -in "$target/tls.csr" \
    -CA "$DIR/authority/ca.crt" -CAkey "$DIR/authority/ca.key" -CAcreateserial \
    -extfile "$extensions" -out "$target/tls.crt" 2> /dev/null

  rm -f "$target/tls.csr" "$extensions"
  chmod 600 "$target/tls.key"
done

echo "Certificates ready"
