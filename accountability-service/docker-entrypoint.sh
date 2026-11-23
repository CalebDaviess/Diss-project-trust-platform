#!/usr/bin/env sh
set -eu

# Generate an ephemeral RS256 JWT signing keypair on startup if keys are not
# mounted in /tmp/jwt (so no private keys are ever baked into public images).
KEY_DIR="/tmp/jwt"
PRIV="${KEY_DIR}/privateKey.pem"
PUB="${KEY_DIR}/publicKey.pem"

if [ ! -f "$PRIV" ] || [ ! -f "$PUB" ]; then
  mkdir -p "$KEY_DIR"
  echo "[accountability-service] Generating runtime RS256 JWT keypair in ${KEY_DIR}..."
  openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$PRIV" 2>/dev/null
  openssl rsa -in "$PRIV" -pubout -out "$PUB" 2>/dev/null
  chmod 600 "$PRIV"
fi

exec java -Djava.util.logging.manager=org.jboss.logmanager.LogManager -jar /app/quarkus-run.jar
