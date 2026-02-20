import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { withAdmin } from '@/lib/auth';

export const GET = withAdmin(async (_req, userId) => {
  const rows = db.prepare('SELECT * FROM profiles WHERE user_id = ? ORDER BY layer, key').all(userId) as any[];
  return NextResponse.json(rows.map((r: any) => ({ ...r, value: JSON.parse(r.value) })));
});

export const PUT = withAdmin(async (req, userId) => {
  const { entries } = await req.json();
  const upsert = db.prepare(`INSERT INTO profiles (user_id, layer, key, value, source, updated_at)
    VALUES (?, ?, ?, ?, 'admin', datetime('now'))
    ON CONFLICT(user_id, layer, key) DO UPDATE SET value=excluded.value, source='admin', updated_at=datetime('now')`);
  for (const e of entries) upsert.run(userId, e.layer, e.key, JSON.stringify(e.value));
  return NextResponse.json({ ok: true });
});
