import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { withAuth } from '@/lib/auth';

export const POST = withAuth(async (req, agent) => {
  if (!agent.permissions.includes('write')) return NextResponse.json({ error: 'No write permission' }, { status: 403 });
  const { observations } = await req.json();
  if (!Array.isArray(observations)) return NextResponse.json({ error: 'Missing observations array' }, { status: 400 });

  const upsert = db.prepare(`INSERT INTO profiles (user_id, layer, key, value, confidence, source, tags, expires_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, layer, key) DO UPDATE SET
      value = CASE WHEN excluded.confidence > profiles.confidence THEN excluded.value ELSE profiles.value END,
      confidence = MAX(profiles.confidence, excluded.confidence),
      source = CASE WHEN excluded.confidence > profiles.confidence THEN excluded.source ELSE profiles.source END,
      tags = COALESCE(excluded.tags, profiles.tags),
      expires_at = COALESCE(excluded.expires_at, profiles.expires_at),
      updated_at = datetime('now')`);

  for (const obs of observations) {
    const tags = Array.isArray(obs.tags) ? obs.tags.join(',') : obs.tags || null;
    // context 层默认 24h 过期
    const defaultExpiry = (obs.layer || 'context') === 'context' && !obs.expiresAt
      ? new Date(Date.now() + 86400000).toISOString() : null;
    upsert.run(agent.userId, obs.layer || 'context', obs.key, JSON.stringify(obs.value),
      obs.confidence ?? 0.5, agent.id, tags, obs.expiresAt || defaultExpiry);
  }
  return NextResponse.json({ ok: true, count: observations.length });
});
