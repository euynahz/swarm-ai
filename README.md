# 🐝 Swarm AI

Cross-agent user profile hub. Teach one agent, all agents remember.

## The Problem

You use 5 AI agents. Each one asks your name, your tech stack, your preferences — every single time. N devices × M agents = N×M information silos.

## The Solution

A shared profile server that any AI agent can read from and write to. One API, any platform.

```
Agent A learns "user prefers TypeScript" → writes to Swarm AI
Agent B starts a new session → reads from Swarm AI → already knows
```

## Quick Start

```bash
git clone https://github.com/euynahz/swarm-ai.git
cd swarm-ai
npm install
npm run dev  # http://localhost:3777
```

Create an agent:
```bash
curl -X POST http://localhost:3777/api/v1/admin/agents \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: swarm-admin-dev" \
  -d '{"id":"my-agent","name":"My Agent"}'
# Returns: {"id":"my-agent","apiKey":"swarm_xxx","permissions":"read,write"}
```

Read/write profile:
```bash
# Write
curl -X PATCH http://localhost:3777/api/v1/profile \
  -H "Authorization: Bearer swarm_xxx" \
  -H "Content-Type: application/json" \
  -d '{"layer":"identity","entries":{"name":"Alice","language":"en"}}'

# Read
curl http://localhost:3777/api/v1/profile -H "Authorization: Bearer swarm_xxx"
```

## Architecture

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  OpenClaw   │  │ Claude Code │  │   Cursor    │
│   (Peon)    │  │             │  │             │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────────────┼────────────────┘
                        │ REST API
                 ┌──────┴──────┐
                 │  Swarm AI   │
                 │   Server    │
                 │  (Next.js)  │
                 └──────┬──────┘
                        │
                 ┌──────┴──────┐
                 │   SQLite    │
                 │  (node:sqlite)
                 └─────────────┘
```

## Profile Structure

Profiles are organized by **layers** (free-form namespaces):

| Layer | Purpose | TTL |
|-------|---------|-----|
| `identity` | Name, language, timezone | Permanent |
| `work` | Tech stack, role, projects | Permanent |
| `communication` | Style, preferences | Permanent |
| `context` | Current task, mood | 24h auto-expire |
| *custom* | Anything you want | Configurable |

Each entry has `confidence` (0-1) and `source` (which agent wrote it). Higher confidence observations overwrite lower ones.

## Agent Integration

### Option 1: Shell Scripts (recommended)

The `skill/` directory contains ready-to-use bash scripts:

```bash
# Bootstrap — inject profile into agent context at session start
bash skill/swarm-ai-skill/scripts/bootstrap.sh

# Observe — record new information about the user
bash skill/swarm-ai-skill/scripts/observe.sh \
  '[{"key":"tech_stack","value":["TypeScript","React"],"layer":"work"}]'

# Search memory
bash skill/swarm-ai-skill/scripts/memory-read.sh "project decisions"
```

### Option 2: REST API

See [API docs](#api) below.

### Option 3: MCP Server

```bash
SWARM_API_KEY=xxx npx tsx mcp-server.ts
```

## Platform Setup

**OpenClaw** — Add to `AGENTS.md`:
```
Run `bash scripts/bootstrap.sh` to load user profile context
```

**Claude Code** — Add to `CLAUDE.md`:
```
At task start, run: bash scripts/bootstrap.sh
```

**Cursor** — Add to `.cursorrules`:
```
At session start, execute scripts/bootstrap.sh
```

## API

All agent endpoints require `Authorization: Bearer <api_key>`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/profile?layer=&tag=` | Read profile |
| `PATCH` | `/api/v1/profile` | Update profile |
| `POST` | `/api/v1/profile/observe` | Submit observations |
| `GET` | `/api/v1/memory?q=&tag=` | Search memory |
| `POST` | `/api/v1/memory` | Write memory |
| `GET` | `/api/v1/persona/me` | Read agent persona |

Admin endpoints require `X-Admin-Token` header:

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/admin/agents` | Create agent |
| `DELETE` | `/api/v1/admin/agents/:id` | Delete agent |
| `GET` | `/api/v1/admin/profile` | View all profile data |

## Tech Stack

- **Runtime**: Node.js 24+
- **Framework**: Next.js 15 (App Router)
- **Database**: `node:sqlite` (built-in, zero deps)
- **Auth**: API Key per agent + Admin Token

## License

MIT
