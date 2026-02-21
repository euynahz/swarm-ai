export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import db, { isPg } from '@/lib/db';
import { initSchema, logAudit, ensureDefaultUser } from '@/lib/schema';
import { withAdmin } from '@/lib/auth';

const NOW = isPg ? 'NOW()' : "datetime('now')";

export const POST = withAdmin(async (_req, userId) => {
  await initSchema();
  const expired = await db.prepare(
    `SELECT COUNT(*) as count FROM profiles WHERE expires_at IS NOT NULL AND expires_at < ${NOW}`
  ).get() as any;

  await db.prepare(
    `DELETE FROM profiles WHERE expires_at IS NOT NULL AND expires_at < ${NOW}`
  ).run();

  await logAudit(userId, null, 'cleanup', 'profiles', undefined, `${expired?.count || 0} expired entries removed`);
  return NextResponse.json({ ok: true, removed: expired?.count || 0 });
});
