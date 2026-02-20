import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async (req, agent) => {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get('q'), tag = searchParams.get('tag'), limit = Number(searchParams.get('limit') || 50);
  let rows;
  if (q) rows = db.prepare('SELECT * FROM memories WHERE user_id = ? AND content LIKE ? ORDER BY created_at DESC LIMIT ?').all(agent.userId, `%${q}%`, limit);
  else if (tag) rows = db.prepare('SELECT * FROM memories WHERE user_id = ? AND tags LIKE ? ORDER BY created_at DESC LIMIT ?').all(agent.userId, `%${tag}%`, limit);
  else rows = db.prepare('SELECT * FROM memories WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(agent.userId, limit);
  return NextResponse.json(rows);
});

export const POST = withAuth(async (req, agent) => {
  if (!agent.permissions.includes('write')) return NextResponse.json({ error: 'No write permission' }, { status: 403 });
  const { key, content, tags } = await req.json();
  if (!content) return NextResponse.json({ error: 'Missing content' }, { status: 400 });
  db.prepare('INSERT INTO memories (user_id, key, content, source, tags) VALUES (?, ?, ?, ?, ?)')
    .run(agent.userId, key || null, content, agent.id, Array.isArray(tags) ? tags.join(',') : tags || null);
  return NextResponse.json({ ok: true });
});
