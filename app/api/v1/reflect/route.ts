export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { initSchema, logAudit } from '@/lib/schema';
import { withAuth } from '@/lib/auth';

/**
 * Reflect: analyze recent memories and extract profile insights.
 * POST /api/v1/reflect — triggers reflection for the calling agent's user.
 * 
 * Strategy: scan recent memories not yet reflected, extract facts/preferences/observations,
 * and upsert them into the profile with source="reflect".
 * 
 * For MVP: rule-based extraction (keyword/type matching).
 * Future: LLM-powered reflection.
 */
export const POST = withAuth(async (req, agent) => {
  await initSchema();
  if (!agent.permissions.includes('write')) return NextResponse.json({ error: 'No write permission' }, { status: 403 });

  const { since, limit: maxMemories } = await req.json().catch(() => ({}));
  const sinceDate = since || new Date(Date.now() - 7 * 86400000).toISOString();
  const lim = maxMemories || 100;

  // Get recent memories that haven't been reflected
  const memories = await db.prepare(
    'SELECT * FROM memories WHERE user_id = ? AND created_at >= ? ORDER BY created_at DESC LIMIT ?'
  ).all(agent.userId, sinceDate, lim) as any[];

  if (memories.length === 0) return NextResponse.json({ reflected: 0, updates: [] });

  // Rule-based reflection: extract profile updates from typed memories
  const updates: { layer: string; key: string; value: any }[] = [];

  for (const m of memories) {
    const content = m.content?.toLowerCase() || '';
    const tags = m.tags?.split(',') || [];

    // Preferences → profile.preferences
    if (m.type === 'preference' || tags.includes('preference')) {
      updates.push({ layer: 'preferences', key: m.key || `pref_${m.id}`, value: m.content });
    }

    // Facts → profile.identity
    if (m.type === 'fact' || tags.includes('fact')) {
      updates.push({ layer: 'identity', key: m.key || `fact_${m.id}`, value: m.content });
    }

    // Extract tech stack mentions
    const techPatterns = ['typescript', 'react', 'next.js', 'python', 'rust', 'go', 'vue', 'svelte', 'tailwind', 'node'];
    const mentioned = techPatterns.filter(t => content.includes(t));
    if (mentioned.length > 0) {
      updates.push({ layer: 'preferences', key: 'tech_mentions', value: mentioned });
    }

    // Extract project names from tags
    if (tags.includes('project') && m.key) {
      updates.push({ layer: 'context', key: `project_${m.key}`, value: m.content });
    }
  }

  // Deduplicate by layer+key (keep last)
  const deduped = new Map<string, typeof updates[0]>();
  for (const u of updates) deduped.set(`${u.layer}:${u.key}`, u);
  const finalUpdates = [...deduped.values()];

  // Write to profile
  const isPg = !!process.env.DATABASE_URL;
  const NOW = isPg ? 'NOW()' : "datetime('now')";
  const EXCL = isPg ? 'EXCLUDED' : 'excluded';
  for (const u of finalUpdates) {
    await db.prepare(`INSERT INTO profiles (user_id, layer, key, value, confidence, source, updated_at)
      VALUES (?, ?, ?, ?, 0.6, 'reflect', ${NOW})
      ON CONFLICT(user_id, layer, key) DO UPDATE SET value=${EXCL}.value, source='reflect', updated_at=${NOW}`)
      .run(agent.userId, u.layer, u.key, JSON.stringify(u.value));
  }

  await logAudit(agent.userId, agent.id, 'reflect', 'profile', undefined, `${finalUpdates.length} updates from ${memories.length} memories`);

  return NextResponse.json({
    reflected: memories.length,
    updates: finalUpdates.map(u => ({ layer: u.layer, key: u.key })),
  });
});
