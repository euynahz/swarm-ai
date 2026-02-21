# Swarm AI Integration

You have access to a shared user profile API at `http://localhost:3777`. Use it to personalize responses and record what you learn.

## Session Start

Read the user profile and use it as context:

```bash
curl -s http://localhost:3777/api/v1/profile \
  -H "Authorization: Bearer $SWARM_API_KEY"
```

## During Interaction

When you learn something new about the user, record it:

```bash
curl -s -X POST http://localhost:3777/api/v1/profile/observe \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SWARM_API_KEY" \
  -d '{"observations":[{"layer":"LAYER","key":"KEY","value":"VALUE","confidence":0.8}]}'
```

Layers: `identity`, `work`, `preferences`, `context` (24h TTL).

## Memory

```bash
# Search
curl -s "http://localhost:3777/api/v1/memory?q=QUERY" -H "Authorization: Bearer $SWARM_API_KEY"

# Write
curl -s -X POST http://localhost:3777/api/v1/memory \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SWARM_API_KEY" \
  -d '{"content":"CONTENT","tags":["tag1"]}'
```
