import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getAgentByKey } from './schema';

const JWT_SECRET = new TextEncoder().encode(process.env.SWARM_JWT_SECRET || 'swarm-dev-secret');

async function verifyJwt(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.userId ? { userId: payload.userId as string } : null;
  } catch { return null; }
}

export function withAuth(handler: (req: NextRequest, agent: { id: string; userId: string; permissions: string }) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const key = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!key) return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    const agent = await getAgentByKey(key);
    if (!agent) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    return handler(req, agent);
  };
}

export function withAdmin(handler: (req: NextRequest, userId: string) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    // Accept admin token OR JWT from admin user
    const token = req.headers.get('x-admin-token') || req.nextUrl.searchParams.get('token');
    if (token === (process.env.SWARM_ADMIN_TOKEN || 'swarm-admin-dev')) {
      const { ensureDefaultUser } = await import('./schema');
      return handler(req, await ensureDefaultUser());
    }
    const jwt = req.headers.get('authorization')?.replace('Bearer ', '');
    if (jwt) {
      const payload = await verifyJwt(jwt);
      if (payload?.userId) return handler(req, payload.userId);
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  };
}

export { initSchema } from './schema';

export function withAuthOrAdmin(handler: (req: NextRequest, agent: { id: string; userId: string; permissions: string }) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    // Try agent API key first
    const key = req.headers.get('authorization')?.replace('Bearer ', '');
    if (key) {
      const agent = await getAgentByKey(key);
      if (agent) return handler(req, agent);
      // Try JWT
      const payload = await verifyJwt(key);
      if (payload?.userId) return handler(req, { id: 'admin', userId: payload.userId, permissions: 'read,write' });
    }
    // Try admin token
    const token = req.headers.get('x-admin-token') || req.nextUrl.searchParams.get('token');
    if (token === (process.env.SWARM_ADMIN_TOKEN || 'swarm-admin-dev')) {
      const { ensureDefaultUser } = await import('./schema');
      const userId = await ensureDefaultUser();
      return handler(req, { id: 'admin', userId, permissions: 'read,write' });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  };
}
