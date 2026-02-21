#!/bin/bash
# swarm-ai session-start — 会话开始时调用
# 记录会话启动时间，用于后续 reflect 计算"本次会话"的记忆范围
set -euo pipefail
source "$(dirname "$0")/env.sh"

SESSION_FILE="${SWARM_SESSION_FILE:-/tmp/swarm-session-${SWARM_AGENT_ID:-unknown}.json}"

# 写入会话起始标记
cat > "$SESSION_FILE" <<EOF
{
  "agent_id": "${SWARM_AGENT_ID:-unknown}",
  "started_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "pid": $$
}
EOF

# 同时输出画像上下文（保持 bootstrap 的原有功能）
"$(dirname "$0")/bootstrap.sh"
