#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "Verwendung: $0 <participantRegisteredId> [deregisteredOn]" >&2
  exit 1
fi

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3001/api}"
PARTICIPANT_REGISTERED_ID="$1"
DEREGISTERED_ON="${2:-}"

if [[ -n "${DEREGISTERED_ON}" ]]; then
  PAYLOAD="$(printf '{"participantRegisteredId":"%s","deregisteredOn":"%s"}' "${PARTICIPANT_REGISTERED_ID}" "${DEREGISTERED_ON}")"
else
  PAYLOAD="$(printf '{"participantRegisteredId":"%s"}' "${PARTICIPANT_REGISTERED_ID}")"
fi

curl -sS \
  -X POST \
  "${API_BASE_URL}/participants/deregister" \
  -H "content-type: application/json" \
  -d "${PAYLOAD}"

echo
