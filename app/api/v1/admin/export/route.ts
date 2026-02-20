export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { initSchema } from '@/lib/schema';
import { withAdmin } from '@/lib/auth';

export const GET = withAdmin(async (_req, userId) => {
  await initSchema();
  const profiles = await db.prepare('SELECT layer, key, value, confidence, source, tags, updated_at FROM profiles WHERE user_id = ?').all(userId);
  const agents = await db.prepare('SELECT id, name, permissions, persona, created_at FROM agents WHERE user_id = ?').all(userId);
  const memories = await db.prepare('SELECT key, content, source, tags, type, importance, entities, created_at FROM memories WHERE user_id = ?').all(userId);
  return NextResponse.json({ exported_at: new Date().toISOString(), profiles, agents, memories }, {
    headers: { 'Content-Disposition': 'attachment; filename="swarm-export.json"' },
  });
});
