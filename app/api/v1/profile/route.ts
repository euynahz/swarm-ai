import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async (req, agent) => {
  const layer = req.nextUrl.searchParams.get('layer');
  const tag = req.nextUrl.searchParams.get('tag');

  let sql = 'SELECT layer, key, value, confidence, source, tags, expires_at, updated_at FROM profiles WHERE user_id = ?';
  const params: any[] = [agent.userId];

  // 过滤已过期
  sql += " AND (expires_at IS NULL OR expires_at > datetime('now'))";

  if (layer) { sql += ' AND layer = ?'; params.push(layer); }
  if (tag) { sql += ' AND tags LIKE ?'; params.push(`%${tag}%`); }
  sql += ' ORDER BY layer, key';

  const rows = db.prepare(sql).all(...params) as any[];
  const profile: Record<string, Record<string, any>> = {};
  for (const r of rows) {
    if (!profile[r.layer]) profile[r.layer] = {};
    profile[r.layer][r.key] = {
      value: JSON.parse(r.value), confidence: r.confidence,
      source: r.source, tags: r.tags?.split(',').filter(Boolean) || [],
      expiresAt: r.expires_at, updatedAt: r.updated_at,
    };
  }
  return NextResponse.json(profile);
});

export const PATCH = withAuth(async (req, agent) => {
  if (!agent.permissions.includes('write')) return NextResponse.json({ error: 'No write permission' }, { status: 403 });
  const { layer, entries } = await req.json();
  if (!layer || !entries) return NextResponse.json({ error: 'Missing layer or entries' }, { status: 400 });

  const upsert = db.prepare(`INSERT INTO profiles (user_id, layer, key, value, confidence, source, tags, expires_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, layer, key) DO UPDATE SET value=excluded.value, confidence=excluded.confidence,
    source=excluded.source, tags=excluded.tags, expires_at=excluded.expires_at, updated_at=excluded.updated_at`);

  for (const [key, val] of Object.entries(entries)) {
    const v = typeof val === 'object' && val !== null && 'value' in (val as any) ? (val as any) : { value: val };
    const tags = Array.isArray(v.tags) ? v.tags.join(',') : v.tags || null;
    upsert.run(agent.userId, layer, key, JSON.stringify(v.value), v.confidence ?? 1.0, agent.id, tags, v.expiresAt || null);
  }
  return NextResponse.json({ ok: true });
});
