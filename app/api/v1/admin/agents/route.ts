import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { withAdmin } from '@/lib/auth';

export const GET = withAdmin(async (_req, userId) => {
  return NextResponse.json(
    (db.prepare('SELECT id, name, permissions, persona, created_at FROM agents WHERE user_id = ?').all(userId) as any[])
      .map(a => ({ ...a, persona: a.persona ? JSON.parse(a.persona) : null }))
  );
});

export const POST = withAdmin(async (req, userId) => {
  const { id, name, permissions = 'read,write' } = await req.json();
  const agentId = id || crypto.randomUUID().slice(0, 12);
  const apiKey = `swarm_${crypto.randomUUID().replace(/-/g, '')}`;
  db.prepare('INSERT INTO agents (id, user_id, name, api_key, permissions) VALUES (?,?,?,?,?)').run(agentId, userId, name || agentId, apiKey, permissions);
  return NextResponse.json({ id: agentId, apiKey, permissions });
});

export const PATCH = withAdmin(async (req, userId) => {
  const { id, persona, name } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing agent id' }, { status: 400 });
  if (persona !== undefined)
    db.prepare('UPDATE agents SET persona = ? WHERE id = ? AND user_id = ?').run(JSON.stringify(persona), id, userId);
  if (name !== undefined)
    db.prepare('UPDATE agents SET name = ? WHERE id = ? AND user_id = ?').run(name, id, userId);
  return NextResponse.json({ ok: true });
});
