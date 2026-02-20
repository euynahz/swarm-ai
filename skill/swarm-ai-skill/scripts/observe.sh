#!/bin/bash
# swarm-ai observe
# Usage: ./observe.sh <json_observations>
# Example: ./observe.sh '[{"key":"mood","value":"focused","confidence":0.8}]'
set -euo pipefail
source "$(dirname "$0")/env.sh"
curl -sf -X POST "${SWARM_API_URL}/api/v1/profile/observe" \
  -H "Content-Type: application/json" -H "Authorization: Bearer ${SWARM_API_KEY}" \
  -d "{\"observations\":$1}"
