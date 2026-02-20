import { NextRequest, NextResponse } from 'next/server';
import { getAgentByKey } from './db';

export function withAuth(handler: (req: NextRequest, agent: { id: string; userId: string; permissions: string }) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const key = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!key) return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    const agent = getAgentByKey(key);
    if (!agent) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    return handler(req, agent);
  };
}

export function withAdmin(handler: (req: NextRequest, userId: string) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const token = req.headers.get('x-admin-token') || req.nextUrl.searchParams.get('token');
    if (token !== (process.env.SWARM_ADMIN_TOKEN || 'swarm-admin-dev'))
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { ensureDefaultUser } = await import('./db');
    return handler(req, ensureDefaultUser());
  };
}
