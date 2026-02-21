# 🐝 Swarm AI

Cross-agent user profile hub. Teach one agent, all agents remember.

[![GitHub Pages](https://img.shields.io/badge/docs-live-amber)](https://euynahz.github.io/swarm-ai/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## For Humans (Setup & Admin)

### What is this?

Swarm AI solves a simple problem: you use multiple AI agents (Claude Code, Cursor, OpenClaw, etc.), but each one starts fresh every session — asking your name, tech stack, preferences over and over again.

Swarm AI is a **shared profile server** that any AI agent can read from and write to. One central place for your identity, preferences, work context, and memories.

```
Agent A learns "user prefers TypeScript" → writes to Swarm AI
Agent B starts a new session → reads from Swarm AI → already knows
```

### Quick Start

```bash
npx @peonai/swarm
```

Interactive setup walks you through port, admin token, and optional background service installation. Once done:

```bash
npx @peonai/swarm start    # start the server
npx @peonai/swarm stop     # stop
npx @peonai/swarm status   # check health
```

Dashboard at `http://localhost:3777`.

### Alternative: Docker

```bash
docker compose up -d
# PostgreSQL + Swarm AI on port 3777
```

### Alternative: Manual

```bash
git clone https://github.com/euynahz/swarm-ai.git
cd swarm-ai
npm install
npm run dev
```

### Create Your First Agent

```bash
curl -X POST http://localhost:3777/api/v1/admin/agents \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: swarm-admin-dev" \
  -d '{"id":"my-agent","name":"My Agent"}'
# → {"id":"my-agent","apiKey":"swarm_xxx","permissions":"read,write"}
```

Save the `apiKey` — give it to your AI agent for authentication.

### Management UI

Open `http://localhost:3777` in your browser for the admin dashboard:

- View and edit your profile layers
- Manage agents and their personas
- Search semantic memory
- Review audit logs and change history
- Export all data

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | *(none)* | PostgreSQL connection string (omit for SQLite) |
| `SWARM_ADMIN_TOKEN` | `swarm-admin-dev` | Admin API token |
| `JWT_SECRET` | auto-generated | JWT signing secret |
| `EMBED_URL` | *(built-in)* | Embedding API endpoint |
| `EMBED_KEY` | *(built-in)* | Embedding API key |

---

## For AI Agents (Integration Guide)

### Authentication

Every request must include your API key:

```
Authorization: Bearer swarm_your_api_key_here
```

### Core Concepts

**Profile Layers** — Organized by namespace:
- `identity` — Name, language, timezone (permanent)
- `work` — Tech stack, role, projects (permanent)
- `preferences` — Style, tools, habits (permanent)
- `context` — Current task, mood (24h TTL, auto-expires)

**Confidence Scoring** — Every entry has a confidence (0-1). Higher confidence observations overwrite lower ones. Confirmed facts should use 1.0; guesses should use <0.5.

### What To Do At Session Start

Fetch the user's full profile and inject it into your context:

```bash
curl http://localhost:3777/api/v1/profile \
  -H "Authorization: Bearer $SWARM_API_KEY"
```

Response format:
```json
{
  "layers": {
    "identity": { "name": "Alice", "language": "zh" },
    "work": { "tech_stack": ["TypeScript", "React"] }
  }
}
```

### How To Record New Information

When you learn something about the user, submit an observation:

```bash
curl -X POST http://localhost:3777/api/v1/profile/observe \
  -H "Authorization: Bearer $SWARM_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "observations": [{
      "layer": "preferences",
      "key": "editor_theme",
      "value": "dark",
      "confidence": 0.9,
      "tags": ["tools"]
    }]
  }'
```

Rules:
- Use `observe` for discovered facts (auto-merges based on confidence)
- Use `PATCH /profile` only when explicitly asked to update

### How To Use Memory

Write significant interactions or decisions:

```bash
curl -X POST http://localhost:3777/api/v1/memory \
  -H "Authorization: Bearer $SWARM_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "User decided to use Next.js instead of Bun for this project",
    "tags": ["decision", "tech-stack"],
    "importance": 0.8
  }'
```

Search past context semantically:

```bash
curl "http://localhost:3777/api/v1/memory?q=why+nextjs&mode=semantic" \
  -H "Authorization: Bearer $SWARM_API_KEY"
```

### Shell Scripts (Recommended)

Use the provided scripts for easy integration:

```bash
# Load full profile context
source skill/swarm-ai-skill/scripts/env.sh
bash skill/swarm-ai-skill/scripts/bootstrap.sh

# Record an observation
bash skill/swarm-ai-skill/scripts/observe.sh \
  '[{"layer":"work","key":"project","value":"swarm-ai"}]'

# Search memory
bash skill/swarm-ai-skill/scripts/memory-read.sh "previous decisions"
```

### Platform-Specific Setup

**OpenClaw** — Copy `skill/swarm-ai-skill/` to `~/.openclaw/workspace/skills/`

**Claude Code** — Add `skill/CLAUDE.md` content to your project's CLAUDE.md

**Cursor** — Add to `.cursorrules`:
```
At session start, execute scripts/bootstrap.sh to load user context.
When learning user preferences, use scripts/observe.sh to record them.
```

### API Endpoints Reference

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/profile` | Read profile (`?layer=&tag=`) |
| `PATCH` | `/api/v1/profile` | Update entries directly |
| `POST` | `/api/v1/profile/observe` | Submit observations (preferred) |
| `GET` | `/api/v1/memory` | Search memory (`?q=&mode=semantic`) |
| `POST` | `/api/v1/memory` | Write memory (auto-embeds) |
| `POST` | `/api/v1/reflect` | Trigger memory→profile extraction |
| `GET` | `/api/v1/persona/me` | Read your persona |
| `GET` | `/api/health` | Health check |

---

## Features

- **Layered Profiles** — identity, preferences, work context, custom layers with TTL
- **Semantic Memory** — Qwen3-Embedding powered vector search (2560-dim)
- **Multi-Agent** — each agent gets its own API key, permissions, and persona
- **Audit Trail** — every write logged with agent, action, timestamp, and diff
- **Profile History** — full change history with old/new value comparison
- **Reflect** — auto-extract profile insights from accumulated memories
- **Dual Database** — SQLite (dev) / PostgreSQL (prod), same codebase
- **One-Command Install** — `npx @peonai/swarm` with interactive setup and optional service mode
- **Docker Ready** — `docker compose up -d` one-liner deployment
- **Management UI** — dark amber dashboard with i18n (EN/中文)
- **4 Integration Methods** — REST API / Shell Scripts / MCP Server / OpenAPI

## Architecture

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  OpenClaw   │  │ Claude Code │  │   Cursor    │
│   Agent A   │  │   Agent B   │  │   Agent C   │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────────────┼────────────────┘
                        │ REST API
                 ┌──────┴──────┐
                 │  Swarm AI   │
                 │  (Next.js)  │
                 ├─────────────┤
                 │ Audit Log   │
                 │ Embeddings  │
                 │ Reflect     │
                 └──────┬──────┘
                        │
              ┌─────────┴─────────┐
              │ SQLite │ PostgreSQL│
              │ (dev)  │  (prod)  │
              └────────┴──────────┘
```

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Runtime**: Node.js 24+
- **Database**: `node:sqlite` (dev) / PostgreSQL 17 (prod)
- **Auth**: API Key + JWT (scrypt + HMAC-SHA256, zero deps)
- **Embeddings**: Qwen3-Embedding (2560-dim, OpenAI-compatible API)
- **UI**: React 19 + Tailwind v4
- **Deploy**: Docker Compose

## License

MIT © 2026 PeonAI
