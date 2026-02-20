import { NextRequest, NextResponse } from 'next/server';
import { getAgentByKey } from './db';
import { createHmac, randomUUID, scryptSync, randomBytes } from 'crypto';

const JWT_SECRET = process.env.SWARM_JWT_SECRET || 'change-me-in-production';

function b64url(s: string) { return Buffer.from(s).toString('base64url'); }
function b64dec(s: string) { return Buffer.from(s, 'base64url').toString(); }

export function signJwt(payload: Record<string, any>, expiresIn = 86400 * 7) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + expiresIn }));
  const sig = createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

export function verifyJwt(token: string): Record<string, any> | null {
  try {
    const [h, b, sig] = token.split('.');
    const expected = createHmac('sha256', JWT_SECRET).update(`${h}.${b}`).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(b64dec(b));
    if (payload.exp && payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch { return null; }
}

export function hashPassword(pw: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pw, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(pw: string, stored: string) {
  const [salt, hash] = stored.split(':');
  return scryptSync(pw, salt, 64).toString('hex') === hash;
}

export function genUserId() { return `u_${randomUUID().replace(/-/g, '').slice(0, 16)}`; }

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
    // Accept admin token OR JWT from admin user
    const token = req.headers.get('x-admin-token') || req.nextUrl.searchParams.get('token');
    if (token === (process.env.SWARM_ADMIN_TOKEN || 'swarm-admin-dev')) {
      const { ensureDefaultUser } = await import('./db');
      return handler(req, ensureDefaultUser());
    }
    const jwt = req.headers.get('authorization')?.replace('Bearer ', '');
    if (jwt) {
      const payload = verifyJwt(jwt);
      if (payload?.userId) return handler(req, payload.userId);
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  };
}
