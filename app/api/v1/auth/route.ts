export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { initSchema } from '@/lib/schema';
import { hashPassword, verifyPassword, signJwt, genUserId } from '@/lib/auth';

export async function POST(req: NextRequest) {
  await initSchema();
  const { action, email, password, name } = await req.json();

  if (action === 'register') {
    if (!email || !password) return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    const exists = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (exists) return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    const id = genUserId();
    await db.prepare('INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)')
      .run(id, name || email.split('@')[0], email, hashPassword(password), 'user');
    return NextResponse.json({ token: signJwt({ userId: id, email }), userId: id });
  }

  if (action === 'login') {
    if (!email || !password) return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    const user = await db.prepare('SELECT id, password_hash, name FROM users WHERE email = ?').get(email) as any;
    if (!user?.password_hash || !verifyPassword(password, user.password_hash))
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    return NextResponse.json({ token: signJwt({ userId: user.id, email }), userId: user.id, name: user.name });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
