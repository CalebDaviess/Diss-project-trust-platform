#!/usr/bin/env bash
# =============================================================================
# generate-jwt-keys.sh — create a LOCAL/DEV RS256 JWT signing keypair.
#
# These keys are DEV ONLY and are .gitignored — they must NEVER be committed.
# In production the real keys are injected at runtime via the same properties:
#   smallrye.jwt.sign.key.location   (private, signing)
#   mp.jwt.verify.publickey.location (public, verification)
#
# The keypair is generated on demand:
#   • automatically by ./dev.sh (preflight), and
#   • automatically by Maven (the `generate-jwt-keys` profile, which activates
#     only when src/main/resources/jwt/privateKey.pem is missing).
#
# Idempotent: if both keys already exist it does nothing. Pass --force to
# rotate (regenerate) them.
# =============================================================================
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/src/main/resources/jwt"
PRIV="$DIR/privateKey.pem"
PUB="$DIR/publicKey.pem"
FORCE="${1:-}"

if ! command -v openssl >/dev/null 2>&1; then
  echo "generate-jwt-keys: openssl not found on PATH — cannot generate JWT keys." >&2
  exit 1
fi

mkdir -p "$DIR"

if [ "$FORCE" != "--force" ] && [ -f "$PRIV" ] && [ -f "$PUB" ]; then
  echo "generate-jwt-keys: keypair already present — skipping (use --force to rotate)."
  exit 0
fi

echo "generate-jwt-keys: generating dev RS256 keypair in $DIR …"
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$PRIV" 2>/dev/null
openssl rsa -in "$PRIV" -pubout -out "$PUB" 2>/dev/null
chmod 600 "$PRIV"
echo "generate-jwt-keys: done (dev only — not committed)."

