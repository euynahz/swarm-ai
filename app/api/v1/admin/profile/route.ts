export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import db, { isPg } from '@/lib/db';
import { initSchema } from '@/lib/schema';
import { withAdmin } from '@/lib/auth';

const NOW = isPg ? 'NOW()' : "datetime('now')";

export const GET = withAdmin(async (_req, userId) => {
  await initSchema();
  const rows = await db.prepare('SELECT * FROM profiles WHERE user_id = ? ORDER BY layer, key').all(userId) as any[];
  return NextResponse.json(rows.map((r: any) => ({ ...r, value: JSON.parse(r.value) })));
});

export const PUT = withAdmin(async (req, userId) => {
  await initSchema();
  const { entries } = await req.json();
  const sql = `INSERT INTO profiles (user_id, layer, key, value, source, updated_at)
    VALUES (?, ?, ?, ?, 'admin', ${NOW})
    ON CONFLICT(user_id, layer, key) DO UPDATE SET value=${isPg ? 'EXCLUDED' : 'excluded'}.value, source='admin', updated_at=${NOW}`;
  for (const e of entries) await db.prepare(sql).run(userId, e.layer, e.key, JSON.stringify(e.value));
  return NextResponse.json({ ok: true });
});
