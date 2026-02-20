# Swarm AI — Agent Skill

跨 Agent 用户画像共享。让每个 agent 都了解用户，不用反复教育。

## 安装

### 1. 配置 API Key

编辑 `scripts/env.sh`：
```bash
export SWARM_API_URL="http://localhost:3777"
export SWARM_API_KEY="your_api_key_here"
```

### 2. 接入你的 Agent 平台

#### OpenClaw
在 `AGENTS.md` 的「Every Session」部分加一行：
```
- Run `bash ~/.openclaw/workspace/skills/swarm-ai-skill/scripts/bootstrap.sh` to load user profile context
```

#### Claude Code
在项目根目录 `CLAUDE.md` 加：
```
At the start of every task, run: bash /path/to/skills/swarm-ai-skill/scripts/bootstrap.sh
When you learn something new about the user, run: bash /path/to/skills/swarm-ai-skill/scripts/observe.sh '[{"key":"...","value":"..."}]'
```

#### Cursor
在 `.cursorrules` 加：
```
At session start, execute: bash /path/to/skills/swarm-ai-skill/scripts/bootstrap.sh
Use the output as user context for personalization.
```

#### 其他平台
任何能执行 shell 的 agent，在 system prompt 里加：
```
Before responding, run `scripts/bootstrap.sh` and use the output as user context.
```

## 脚本

`scripts/` 目录下，全部 bash，零依赖（只需 curl）：

| 脚本 | 用途 | 调用时机 |
|------|------|----------|
| `bootstrap.sh` | 读画像，输出上下文文本 | 会话开始 |
| `profile-read.sh [layer] [tag]` | 读画像 JSON | 需要查具体字段 |
| `profile-update.sh <layer> <json>` | 更新画像 | 确认了新的用户信息 |
| `observe.sh <json_array>` | 提交观察 | 发现用户偏好/习惯 |
| `memory-read.sh [query]` | 搜索记忆 | 需要历史上下文 |
| `memory-write.sh <content> [tags]` | 写入记忆 | 记录重要事件 |

## 什么时候该写入

Agent 应该在以下场景调用 `observe.sh`：
- 用户明确表达偏好（「我喜欢用 TypeScript」）
- 用户纠正了你的假设（「不是 Vue，是 React」）
- 发现用户的工作习惯（沟通风格、时区、角色）
- 项目上下文变化（新项目、技术栈变更）

**不要**记录：敏感信息、临时情绪、一次性指令。

## 画像结构

按 layer 组织，名称自由定义：
- `identity` — 姓名、语言、时区
- `work` — 技术栈、角色、项目
- `communication` — 沟通风格
- `context` — 当前状态（默认 24h 过期）

每条有 `confidence`（0-1），observe 时高 confidence 覆盖低的，不同 agent 的观察互不干扰。
