#!/bin/bash
# swarm-ai bootstrap — 会话开始时调用，输出用户画像上下文
# 输出纯文本，直接注入 system prompt / 上下文
set -euo pipefail
source "$(dirname "$0")/env.sh"

PROFILE=$(curl -sf "${SWARM_API_URL}/api/v1/profile" \
  -H "Authorization: Bearer ${SWARM_API_KEY}" 2>/dev/null || echo '{}')

# 空画像不输出
[ "$PROFILE" = "{}" ] && exit 0

cat <<EOF
[Swarm AI — User Profile Context]
The following is known about the user from cross-agent shared memory.
Use this to personalize your responses. When you learn new information
about the user, call the observe script to record it.

$PROFILE
[End Profile Context]
EOF
