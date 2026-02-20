# Swarm AI Integration

You have access to a user profile API. Use it to understand user preferences and record observations.

## API

Base URL: `http://localhost:3777`
API Key: `swarm_9ec571db81684045a34848ddd23a7dde`

All requests need: `Authorization: Bearer swarm_9ec571db81684045a34848ddd23a7dde`

### Read user profile
```bash
curl -s http://localhost:3777/api/v1/profile -H "Authorization: Bearer swarm_2053c79d1405433bb07c4bf4ac43dd82"
```

### Submit observation (when you learn something new about the user)
```bash
curl -s -X POST http://localhost:3777/api/v1/profile/observe \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer swarm_2053c79d1405433bb07c4bf4ac43dd82" \
  -d '{"observations":[{"layer":"context","key":"KEY","value":"VALUE","confidence":0.8}]}'
```

### Search shared memory
```bash
curl -s "http://localhost:3777/api/v1/memory?q=QUERY" -H "Authorization: Bearer swarm_2053c79d1405433bb07c4bf4ac43dd82"
```

### Write memory
```bash
curl -s -X POST http://localhost:3777/api/v1/memory \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer swarm_2053c79d1405433bb07c4bf4ac43dd82" \
  -d '{"content":"CONTENT","tags":["tag1"]}'
```

## When to use
- Session start: read profile to understand user
- During interaction: observe new preferences/context
- Need history: search memory
