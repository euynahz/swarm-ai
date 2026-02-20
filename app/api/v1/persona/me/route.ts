export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { initSchema } from '@/lib/schema';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async (_req, agent) => {
  await initSchema();
  const row = await db.prepare('SELECT id, name, persona, permissions FROM agents WHERE id = ?').get(agent.id) as any;
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ...row, persona: row.persona ? JSON.parse(row.persona) : null });
});
