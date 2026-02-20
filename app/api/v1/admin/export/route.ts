import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { withAdmin } from '@/lib/auth';

export const GET = withAdmin(async (_req, userId) => {
  const profiles = db.prepare('SELECT layer, key, value, confidence, source, tags, updated_at FROM profiles WHERE user_id = ?').all(userId);
  const agents = db.prepare('SELECT id, name, permissions, persona, created_at FROM agents WHERE user_id = ?').all(userId);
  const memories = db.prepare('SELECT key, content, source, tags, type, importance, entities, created_at FROM memories WHERE user_id = ?').all(userId);
  return NextResponse.json({ exported_at: new Date().toISOString(), profiles, agents, memories }, {
    headers: { 'Content-Disposition': 'attachment; filename="swarm-export.json"' },
  });
});
