export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import db, { isPg } from '@/lib/db';
import { initSchema } from '@/lib/schema';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async (req, agent) => {
  await initSchema();
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
    if (isPg) {
      sql = hasCJK
        ? `SELECT * FROM memories WHERE user_id = ? AND content LIKE ? ORDER BY created_at DESC LIMIT ?`
        : `SELECT *, ts_rank(to_tsvector('english', content), plainto_tsquery('english', ?)) AS rank
           FROM memories WHERE user_id = ? AND to_tsvector('english', content) @@ plainto_tsquery('english', ?)
           ORDER BY rank DESC LIMIT ?`;
      params = hasCJK ? [agent.userId, `%${q}%`, limit] : [q, agent.userId, q, limit];
    } else {
      if (hasCJK) {
        sql = `SELECT * FROM memories WHERE user_id = ? AND content LIKE ? ORDER BY created_at DESC LIMIT ?`;
        params = [agent.userId, `%${q}%`, limit];
      } else {
        sql = `SELECT m.*, rank FROM memories m JOIN memories_fts ON memories_fts.rowid = m.id
          WHERE m.user_id = ? AND memories_fts MATCH ? ORDER BY rank LIMIT ?`;
        params = [agent.userId, q, limit];
      }
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

  const rows = await db.prepare(sql).all(...params) as any[];
  return NextResponse.json(rows.map(r => ({
    ...r,
    tags: r.tags?.split(',').filter(Boolean) || [],
    entities: r.entities?.split(',').filter(Boolean) || [],
  })));
});

export const POST = withAuth(async (req, agent) => {
  await initSchema();
  if (!agent.permissions.includes('write')) return NextResponse.json({ error: 'No write permission' }, { status: 403 });
  const { key, content, tags, type, importance, entities } = await req.json();
  if (!content) return NextResponse.json({ error: 'Missing content' }, { status: 400 });

  const tagsStr = Array.isArray(tags) ? tags.join(',') : tags || null;
  const entStr = Array.isArray(entities) ? entities.join(',') : entities || null;

  await db.prepare(`INSERT INTO memories (user_id, key, content, source, tags, type, importance, entities)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(agent.userId, key || null, content, agent.id, tagsStr, type || 'observation', importance ?? 0.5, entStr);

  return NextResponse.json({ ok: true });
});
