import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';

const DB_PATH = process.env.SWARM_DB_PATH || join(process.cwd(), 'data/swarm.db');
mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, name TEXT, email TEXT UNIQUE,
  password_hash TEXT, role TEXT DEFAULT 'user',
  created_at TEXT DEFAULT (datetime('now'))
)`);

// Migrate: add columns if missing
try { db.exec('ALTER TABLE users ADD COLUMN email TEXT'); } catch {}
try { db.exec('ALTER TABLE users ADD COLUMN password_hash TEXT'); } catch {}
try { db.exec('ALTER TABLE users ADD COLUMN role TEXT DEFAULT \'user\''); } catch {}
try { db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL'); } catch {}
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
  type TEXT DEFAULT 'observation',
  importance REAL DEFAULT 0.5,
  entities TEXT,
  created_at TEXT DEFAULT (datetime('now'))
)`);

// FTS5 full-text index on memories
db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
  content, tags, entities, key,
  content_rowid='id', content='memories'
)`);

// Triggers to keep FTS in sync
try {
  db.exec(`CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
    INSERT INTO memories_fts(rowid, content, tags, entities, key) VALUES (new.id, new.content, new.tags, new.entities, new.key);
  END`);
  db.exec(`CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
    INSERT INTO memories_fts(memories_fts, rowid, content, tags, entities, key) VALUES ('delete', old.id, old.content, old.tags, old.entities, old.key);
  END`);
  db.exec(`CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
    INSERT INTO memories_fts(memories_fts, rowid, content, tags, entities, key) VALUES ('delete', old.id, old.content, old.tags, old.entities, old.key);
    INSERT INTO memories_fts(rowid, content, tags, entities, key) VALUES (new.id, new.content, new.tags, new.entities, new.key);
  END`);
} catch { /* triggers already exist */ }

// Migrate: add columns if missing
try { db.exec('ALTER TABLE memories ADD COLUMN type TEXT DEFAULT \'observation\''); } catch {}
try { db.exec('ALTER TABLE memories ADD COLUMN importance REAL DEFAULT 0.5'); } catch {}
try { db.exec('ALTER TABLE memories ADD COLUMN entities TEXT'); } catch {}

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
