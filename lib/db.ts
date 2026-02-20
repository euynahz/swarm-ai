import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';

const DB_PATH = process.env.SWARM_DB_PATH || join(process.cwd(), 'data/swarm.db');
mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, name TEXT, created_at TEXT DEFAULT (datetime('now'))
)`);
db.exec(`CREATE TABLE IF NOT EXISTS profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  layer TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  confidence REAL DEFAULT 1.0,
  source TEXT,
  tags TEXT,
  expires_at TEXT,
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, layer, key)
)`);
db.exec(`CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL, api_key TEXT UNIQUE NOT NULL,
  permissions TEXT DEFAULT 'read', persona TEXT,
  created_at TEXT DEFAULT (datetime('now'))
)`);
db.exec(`CREATE TABLE IF NOT EXISTS memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  key TEXT, content TEXT NOT NULL, source TEXT, tags TEXT,
  created_at TEXT DEFAULT (datetime('now'))
)`);

export default db;

export function getAgentByKey(apiKey: string) {
  return db.prepare('SELECT id, user_id as userId, permissions FROM agents WHERE api_key = ?').get(apiKey) as
    { id: string; userId: string; permissions: string } | undefined;
}

export function ensureDefaultUser() {
  let user = db.prepare('SELECT id FROM users LIMIT 1').get() as { id: string } | undefined;
  if (!user) {
    db.prepare('INSERT INTO users (id, name) VALUES (?, ?)').run('default', 'Default User');
    return 'default';
  }
  return user.id;
}
