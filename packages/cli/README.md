# @peonai/swarm

One-command install & run for [Swarm AI](https://github.com/peonai/swarm-ai).

## Quick Start

```bash
npx @peonai/swarm
```

Interactive setup will ask for:
- **Install directory** — where to clone & store data (default: `~/.swarm-ai`)
- **Port** — HTTP port (default: `3777`)
- **Admin token** — for dashboard access
- **Service mode** — install as systemd/launchd background service

## Commands

```bash
npx @peonai/swarm          # install & configure
npx @peonai/swarm start    # start service
npx @peonai/swarm stop     # stop service
npx @peonai/swarm status   # check if running
npx @peonai/swarm uninstall # remove service (keeps data)
```

## Service Support

| OS | Method |
|---|---|
| Linux | systemd |
| macOS | launchd |
| Windows | manual / pm2 |
