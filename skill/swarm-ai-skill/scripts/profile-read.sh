#!/bin/bash
# swarm-ai profile read
# Usage: ./profile-read.sh [layer] [tag]
set -euo pipefail
source "$(dirname "$0")/env.sh"
PARAMS=""
[ "${1:-}" ] && PARAMS="?layer=$1"
[ "${2:-}" ] && PARAMS="${PARAMS:+$PARAMS&}${PARAMS:+}${PARAMS:-?}tag=$2"
curl -sf "${SWARM_API_URL}/api/v1/profile${PARAMS}" -H "Authorization: Bearer ${SWARM_API_KEY}"
