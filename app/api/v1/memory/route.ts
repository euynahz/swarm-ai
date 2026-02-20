import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async (req, agent) => {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get('q');
  const tag = searchParams.get('tag');
  const type = searchParams.get('type');
  const entity = searchParams.get('entity');
  const since = searchParams.get('since');
  const limit = Number(searchParams.get('limit') || 50);

  let sql: string, params: any[];

  if (q) {
    const hasCJK = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(q);
    if (hasCJK) {
      // CJK: FTS5 default tokenizer can't segment Chinese, fall back to LIKE
      sql = `SELECT * FROM memories WHERE user_id = ? AND content LIKE ? ORDER BY created_at DESC LIMIT ?`;
      params = [agent.userId, `%${q}%`, limit];
    } else {
      // Latin/English: FTS5 full-text search with ranking
      sql = `SELECT m.*, rank FROM memories m
        JOIN memories_fts ON memories_fts.rowid = m.id
        WHERE m.user_id = ? AND memories_fts MATCH ?
        ORDER BY rank LIMIT ?`;
      params = [agent.userId, q, limit];
    }
  } else {
    sql = 'SELECT * FROM memories WHERE user_id = ?';
    params = [agent.userId];
    if (tag) { sql += ' AND tags LIKE ?'; params.push(`%${tag}%`); }
    if (type) { sql += ' AND type = ?'; params.push(type); }
    if (entity) { sql += ' AND entities LIKE ?'; params.push(`%${entity}%`); }
    if (since) { sql += ' AND created_at >= ?'; params.push(since); }
    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
  }

  const rows = db.prepare(sql).all(...params) as any[];
  return NextResponse.json(rows.map(r => ({
    ...r,
    tags: r.tags?.split(',').filter(Boolean) || [],
    entities: r.entities?.split(',').filter(Boolean) || [],
  })));
});

export const POST = withAuth(async (req, agent) => {
  if (!agent.permissions.includes('write')) return NextResponse.json({ error: 'No write permission' }, { status: 403 });
  const { key, content, tags, type, importance, entities } = await req.json();
  if (!content) return NextResponse.json({ error: 'Missing content' }, { status: 400 });

  const tagsStr = Array.isArray(tags) ? tags.join(',') : tags || null;
  const entStr = Array.isArray(entities) ? entities.join(',') : entities || null;

  db.prepare(`INSERT INTO memories (user_id, key, content, source, tags, type, importance, entities)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(agent.userId, key || null, content, agent.id, tagsStr,
      type || 'observation', importance ?? 0.5, entStr);

  return NextResponse.json({ ok: true });
});
