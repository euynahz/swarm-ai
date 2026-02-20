#!/bin/bash
# swarm-ai memory write
# Usage: ./memory-write.sh <content> [tags_comma_separated]
set -euo pipefail
source "$(dirname "$0")/env.sh"
TAGS="[]"
[ "${2:-}" ] && TAGS="[$(echo "$2" | sed 's/[^,]*/\"&\"/g')]"
curl -sf -X POST "${SWARM_API_URL}/api/v1/memory" \
  -H "Content-Type: application/json" -H "Authorization: Bearer ${SWARM_API_KEY}" \
  -d "{\"content\":$(echo "$1" | python3 -c 'import json,sys;print(json.dumps(sys.stdin.read().strip()))'),\"tags\":$TAGS}"
