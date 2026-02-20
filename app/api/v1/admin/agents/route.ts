import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { withAdmin } from '@/lib/auth';

export const GET = withAdmin(async (_req, userId) => {
  return NextResponse.json(db.prepare('SELECT id, name, permissions, created_at FROM agents WHERE user_id = ?').all(userId));
});

export const POST = withAdmin(async (req, userId) => {
  const { id, name, permissions = 'read,write' } = await req.json();
  const agentId = id || crypto.randomUUID().slice(0, 12);
  const apiKey = `swarm_${crypto.randomUUID().replace(/-/g, '')}`;
  db.prepare('INSERT INTO agents (id, user_id, name, api_key, permissions) VALUES (?,?,?,?,?)').run(agentId, userId, name || agentId, apiKey, permissions);
  return NextResponse.json({ id: agentId, apiKey, permissions });
});
