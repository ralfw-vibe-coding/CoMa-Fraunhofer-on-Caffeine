#!/usr/bin/env bash

set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3001/api}"
REGISTERED_ON="${REGISTERED_ON:-$(date -u +"%Y-%m-%dT%H:%M:%SZ")}"

participants=(
  "Alexander"
  "Jörg"
  "Patrick"
  "Sandy"
  "Tino"
  "Helene"
  "David"
  "Michael"
)

for participant in "${participants[@]}"; do
  echo "Registriere ${participant} ..."
  curl -sS \
    -X POST \
    "${API_BASE_URL}/participants/register" \
    -H "content-type: application/json" \
    -d "$(printf '{"displayName":"%s","registeredOn":"%s"}' "${participant}" "${REGISTERED_ON}")"
  echo
done
