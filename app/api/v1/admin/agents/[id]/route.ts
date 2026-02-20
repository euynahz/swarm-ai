import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { withAdmin } from '@/lib/auth';

export const DELETE = withAdmin(async (req, userId) => {
  const id = req.nextUrl.pathname.split('/').pop() ?? '';
  db.prepare('DELETE FROM agents WHERE id = ? AND user_id = ?').run(id, userId);
  return NextResponse.json({ ok: true });
});
