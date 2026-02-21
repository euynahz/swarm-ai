# Swarm AI Integration

You have access to a shared user profile API. Use it to personalize responses and record what you learn.

## API

Base URL: `http://localhost:3777`

All requests need: `Authorization: Bearer $SWARM_API_KEY`

### Read user profile
```bash
curl -s http://localhost:3777/api/v1/profile -H "Authorization: Bearer $SWARM_API_KEY"
```

### Submit observation (when you learn something new about the user)
```bash
curl -s -X POST http://localhost:3777/api/v1/profile/observe \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SWARM_API_KEY" \
  -d '{"observations":[{"layer":"context","key":"KEY","value":"VALUE","confidence":0.8}]}'
```

### Search shared memory
```bash
curl -s "http://localhost:3777/api/v1/memory?q=QUERY" -H "Authorization: Bearer $SWARM_API_KEY"
```

### Write memory
```bash
curl -s -X POST http://localhost:3777/api/v1/memory \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SWARM_API_KEY" \
  -d '{"content":"CONTENT","tags":["tag1"]}'
```

## When to use
- Session start: read profile to understand user
- During interaction: observe new preferences/context
- Need history: search memory
