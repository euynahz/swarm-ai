#!/usr/bin/env node
// @peonai/swarm — one-command install & run
import { createInterface } from 'node:readline';
import { execSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, chmodSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir, platform, arch } from 'node:os';

const REPO = 'https://github.com/peonai/swarm-ai.git';
const AMBER = '\x1b[38;2;240;168;48m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const R = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';

const hex = `
    ${DIM}⬡ ⬡ ⬡${R}
   ${AMBER}⬡${R} ${DIM}⬡${R} ${AMBER}⬡${R}
    ${DIM}⬡ ⬡ ⬡${R}`;

function log(msg) { console.log(`  ${msg}`); }
function ok(msg) { log(`${GREEN}✓${R} ${msg}`); }
function err(msg) { log(`${RED}✗${R} ${msg}`); }
function head(msg) { console.log(`\n  ${AMBER}${BOLD}${msg}${R}`); }

// ── Prompt helper ──
function ask(rl, question, fallback) {
  return new Promise(res => {
    const suffix = fallback ? ` ${DIM}(${fallback})${R}` : '';
    rl.question(`  ${question}${suffix}: `, ans => res(ans.trim() || fallback || ''));
  });
}
function confirm(rl, question, def = true) {
  return new Promise(res => {
    const hint = def ? 'Y/n' : 'y/N';
    rl.question(`  ${question} ${DIM}(${hint})${R}: `, ans => {
      const a = ans.trim().toLowerCase();
      res(a ? a === 'y' || a === 'yes' : def);
    });
  });
}

// ── Check prerequisites ──
function checkPrereqs() {
  head('Checking prerequisites');
  const nodeV = process.versions.node.split('.').map(Number);
  if (nodeV[0] < 18) { err(`Node.js >= 18 required (got ${process.version})`); process.exit(1); }
  ok(`Node.js ${process.version}`);

  try { execSync('git --version', { stdio: 'pipe' }); ok('git'); }
  catch { err('git not found — install git first'); process.exit(1); }
}

// ── Main ──
async function main() {
  console.log(hex);
  head('Swarm AI Installer');
  log(`${DIM}Cross-agent user profile sync${R}\n`);

  const cmd = process.argv[2];
  if (cmd === 'start') return startServer();
  if (cmd === 'stop') return stopService();
  if (cmd === 'status') return showStatus();
  if (cmd === 'uninstall') return uninstall();

  checkPrereqs();

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    await setup(rl);
  } finally {
    rl.close();
  }
}

async function setup(rl) {
  const defaultDir = join(homedir(), '.swarm-ai');

  head('Configuration');
  const dataDir = resolve(await ask(rl, 'Install directory', defaultDir));
  const port = await ask(rl, 'Port', '3777');
  const adminToken = await ask(rl, 'Admin token', 'swarm-admin-dev');
  const asService = await confirm(rl, 'Install as background service?', true);

  // ── Clone / update ──
  head('Installing');
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

  const serverDir = join(dataDir, 'server');
  if (existsSync(join(serverDir, 'package.json'))) {
    log('Updating existing installation...');
    execSync('git pull --ff-only', { cwd: serverDir, stdio: 'inherit' });
  } else {
    log('Cloning repository...');
    execSync(`git clone --depth 1 ${REPO} "${serverDir}"`, { stdio: 'inherit' });
  }

  // ── Install deps & build ──
  log('Installing dependencies...');
  execSync('npm install --production=false', { cwd: serverDir, stdio: 'inherit' });

  log('Building...');
  execSync('npm run build', { cwd: serverDir, stdio: 'inherit' });
  ok('Build complete');

  // ── Write config ──
  const configPath = join(dataDir, 'config.json');
  const config = { port: Number(port), adminToken, serverDir, service: asService };
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  ok(`Config saved → ${configPath}`);

  // ── Write .env ──
  const envPath = join(serverDir, '.env.local');
  writeFileSync(envPath, [
    `PORT=${port}`,
    `SWARM_ADMIN_TOKEN=${adminToken}`,
    `SWARM_DATA_DIR=${dataDir}/data`,
  ].join('\n') + '\n');
  mkdirSync(join(dataDir, 'data'), { recursive: true });
  ok('.env.local written');

  // ── Service install ──
  if (asService) {
    installService(config, dataDir);
  }

  // ── Done ──
  head('Done! 🐝');
  log(`Server directory: ${DIM}${serverDir}${R}`);
  log(`Config: ${DIM}${configPath}${R}`);
  log(`Port: ${AMBER}${port}${R}`);
  console.log();
  if (asService) {
    log(`Service installed. Commands:`);
    log(`  ${AMBER}npx @peonai/swarm start${R}   — start service`);
    log(`  ${AMBER}npx @peonai/swarm stop${R}    — stop service`);
    log(`  ${AMBER}npx @peonai/swarm status${R}  — check status`);
  } else {
    log(`Start manually:`);
    log(`  ${AMBER}cd ${serverDir} && npm start${R}`);
  }
  console.log();
}

// ── Service management ──
function loadConfig() {
  const p = join(homedir(), '.swarm-ai', 'config.json');
  if (!existsSync(p)) { err('Not installed. Run: npx @peonai/swarm'); process.exit(1); }
  return JSON.parse(readFileSync(p, 'utf8'));
}

function installService(config, dataDir) {
  const os = platform();
  if (os === 'linux') return installSystemd(config, dataDir);
  if (os === 'darwin') return installLaunchd(config, dataDir);
  log(`${DIM}Auto-service not supported on ${os}, use pm2 or run manually${R}`);
}

function installSystemd(config, dataDir) {
  const unit = `[Unit]
Description=Swarm AI Server
After=network.target

[Service]
Type=simple
WorkingDirectory=${config.serverDir}
ExecStart=${process.execPath} ${join(config.serverDir, 'node_modules/.bin/next')} start -p ${config.port}
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
`;
  const unitPath = join(dataDir, 'swarm-ai.service');
  writeFileSync(unitPath, unit);
  ok(`Systemd unit → ${unitPath}`);

  try {
    const sysPath = '/etc/systemd/system/swarm-ai.service';
    execSync(`sudo ln -sf "${unitPath}" "${sysPath}" && sudo systemctl daemon-reload`, { stdio: 'inherit' });
    ok('Systemd service registered');
  } catch {
    log(`${DIM}Run manually: sudo ln -sf "${unitPath}" /etc/systemd/system/swarm-ai.service${R}`);
  }
}

function installLaunchd(config, dataDir) {
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>ai.peon.swarm</string>
  <key>ProgramArguments</key><array>
    <string>${process.execPath}</string>
    <string>${join(config.serverDir, 'node_modules/.bin/next')}</string>
    <string>start</string>
    <string>-p</string>
    <string>${config.port}</string>
  </array>
  <key>WorkingDirectory</key><string>${config.serverDir}</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>${dataDir}/swarm.log</string>
  <key>StandardErrorPath</key><string>${dataDir}/swarm.err</string>
</dict></plist>`;
  const plistPath = join(homedir(), 'Library/LaunchAgents/ai.peon.swarm.plist');
  writeFileSync(plistPath, plist);
  ok(`LaunchAgent → ${plistPath}`);
}

function startServer() {
  const config = loadConfig();
  head('Starting Swarm AI');
  if (platform() === 'linux') {
    try { execSync('sudo systemctl start swarm-ai', { stdio: 'inherit' }); ok(`Running on port ${config.port}`); return; } catch {}
  }
  if (platform() === 'darwin') {
    try { execSync('launchctl load ~/Library/LaunchAgents/ai.peon.swarm.plist', { stdio: 'inherit' }); ok(`Running on port ${config.port}`); return; } catch {}
  }
  // Fallback: direct start
  log('Starting in foreground...');
  const child = spawn('npm', ['start'], { cwd: config.serverDir, stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } });
  child.on('exit', code => process.exit(code ?? 0));
}

function stopService() {
  head('Stopping Swarm AI');
  if (platform() === 'linux') {
    try { execSync('sudo systemctl stop swarm-ai', { stdio: 'inherit' }); ok('Stopped'); return; } catch {}
  }
  if (platform() === 'darwin') {
    try { execSync('launchctl unload ~/Library/LaunchAgents/ai.peon.swarm.plist', { stdio: 'inherit' }); ok('Stopped'); return; } catch {}
  }
  err('No service found');
}

function showStatus() {
  const config = loadConfig();
  head('Swarm AI Status');
  log(`Port: ${config.port}`);
  log(`Dir: ${config.serverDir}`);
  try {
    execSync(`curl -sf http://localhost:${config.port}/api/health`, { stdio: 'pipe' });
    ok(`${GREEN}Running${R}`);
  } catch {
    log(`${RED}● Not running${R}`);
  }
}

function uninstall() {
  head('Uninstalling');
  if (platform() === 'linux') {
    try { execSync('sudo systemctl stop swarm-ai && sudo systemctl disable swarm-ai && sudo rm /etc/systemd/system/swarm-ai.service', { stdio: 'pipe' }); } catch {}
  }
  if (platform() === 'darwin') {
    try { execSync('launchctl unload ~/Library/LaunchAgents/ai.peon.swarm.plist', { stdio: 'pipe' }); } catch {}
  }
  ok('Service removed. Data kept at ~/.swarm-ai/');
  log(`${DIM}To fully remove: rm -rf ~/.swarm-ai${R}`);
}

main().catch(e => { err(e.message); process.exit(1); });
