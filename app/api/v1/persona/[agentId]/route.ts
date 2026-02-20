export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { initSchema } from '@/lib/schema';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async (req: NextRequest & { agentId?: string }, agent) => {
  await initSchema();
  const agentId = req.nextUrl.pathname.split('/').pop() ?? '';
  const row = await db.prepare('SELECT id, name, persona FROM agents WHERE id = ? AND user_id = ?').get(agentId, agent.userId) as any;
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ...row, persona: row.persona ? JSON.parse(row.persona) : null });
});
