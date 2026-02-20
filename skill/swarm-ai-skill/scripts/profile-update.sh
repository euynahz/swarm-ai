#!/bin/bash
# swarm-ai profile update
# Usage: ./profile-update.sh <layer> <json_entries>
# Example: ./profile-update.sh work '{"tech_stack":{"value":["TS","React"],"tags":["dev"]}}'
set -euo pipefail
source "$(dirname "$0")/env.sh"
curl -sf -X PATCH "${SWARM_API_URL}/api/v1/profile" \
  -H "Content-Type: application/json" -H "Authorization: Bearer ${SWARM_API_KEY}" \
  -d "{\"layer\":\"$1\",\"entries\":$2}"
