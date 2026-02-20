#!/bin/bash
# swarm-ai memory search/list
# Usage: ./memory-read.sh [search_query]
set -euo pipefail
source "$(dirname "$0")/env.sh"
Q="${1:-}"
[ "$Q" ] && P="?q=$Q" || P=""
curl -sf "${SWARM_API_URL}/api/v1/memory${P}" -H "Authorization: Bearer ${SWARM_API_KEY}"
