export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import db, { isPg } from '@/lib/db';
import { initSchema, logAudit } from '@/lib/schema';
import { withAuth } from '@/lib/auth';

const LLM_URL = process.env.LLM_URL || process.env.EMBED_URL?.replace('/embeddings', '/chat/completions') || '';
const LLM_KEY = process.env.LLM_KEY || process.env.EMBED_KEY || '';
const LLM_MODEL = process.env.LLM_MODEL || 'gpt-4o-mini';

const SYSTEM_PROMPT = `You are a profile extraction engine. Given a list of user memories/observations, extract structured profile updates.

Output ONLY a JSON array of objects with: {"layer", "key", "value", "confidence"}
- layer: "identity" | "work" | "preferences" | "communication" | custom
- key: snake_case identifier (e.g. "preferred_language", "tech_stack")
- value: extracted value (string, array, or object)
- confidence: 0.0-1.0 based on how certain the information is

Rules:
- Merge related memories into single profile entries
- Use high confidence (0.8-1.0) for explicit statements, low (0.3-0.5) for inferences
- Skip trivial or transient information
- Output valid JSON array only, no markdown`;

async function llmExtract(memories: any[]): Promise<{ layer: string; key: string; value: any; confidence: number }[]> {
  if (!LLM_URL || !LLM_KEY) return [];
  const content = memories.map((m, i) => `[${i + 1}] (${m.type || 'observation'}) ${m.content}`).join('\n');
  const res = await fetch(LLM_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LLM_KEY}` },
    body: JSON.stringify({ model: LLM_MODEL, messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content },
    ], temperature: 0.1 }),
  });
  if (!res.ok) throw new Error(`LLM API ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '[]';
  // Extract JSON from possible markdown fence
  const match = text.match(/\[[\s\S]*\]/);
  return match ? JSON.parse(match[0]) : [];
}

export const POST = withAuth(async (req, agent) => {
  await initSchema();
  if (!agent.permissions.includes('write')) return NextResponse.json({ error: 'No write permission' }, { status: 403 });

  const { since, limit: maxMemories } = await req.json().catch(() => ({}));
  const sinceDate = since || new Date(Date.now() - 7 * 86400000).toISOString();
  const lim = maxMemories || 100;

  const memories = await db.prepare(
    'SELECT * FROM memories WHERE user_id = ? AND created_at >= ? ORDER BY created_at DESC LIMIT ?'
  ).all(agent.userId, sinceDate, lim) as any[];

  if (memories.length === 0) return NextResponse.json({ reflected: 0, updates: [] });

  let updates: { layer: string; key: string; value: any; confidence: number }[];
  let method: string;

  try {
    updates = await llmExtract(memories);
    method = 'llm';
  } catch {
    // Fallback: rule-based
    updates = [];
    for (const m of memories) {
      const tags = m.tags?.split(',') || [];
      if (m.type === 'preference' || tags.includes('preference'))
        updates.push({ layer: 'preferences', key: m.key || `pref_${m.id}`, value: m.content, confidence: 0.6 });
      if (m.type === 'fact' || tags.includes('fact'))
        updates.push({ layer: 'identity', key: m.key || `fact_${m.id}`, value: m.content, confidence: 0.7 });
    }
    method = 'rules';
  }

  // Deduplicate
  const deduped = new Map<string, typeof updates[0]>();
  for (const u of updates) deduped.set(`${u.layer}:${u.key}`, u);
  const final = [...deduped.values()];

  const NOW = isPg ? 'NOW()' : "datetime('now')";
  const EXCL = isPg ? 'EXCLUDED' : 'excluded';
  for (const u of final) {
    await db.prepare(`INSERT INTO profiles (user_id, layer, key, value, confidence, source, updated_at)
      VALUES (?, ?, ?, ?, ?, 'reflect', ${NOW})
      ON CONFLICT(user_id, layer, key) DO UPDATE SET
        value = CASE WHEN ${EXCL}.confidence > profiles.confidence THEN ${EXCL}.value ELSE profiles.value END,
        confidence = CASE WHEN ${EXCL}.confidence > profiles.confidence THEN ${EXCL}.confidence ELSE profiles.confidence END,
        source = 'reflect', updated_at = ${NOW}`)
      .run(agent.userId, u.layer, u.key, JSON.stringify(u.value), u.confidence ?? 0.6);
  }

  await logAudit(agent.userId, agent.id, 'reflect', 'profile', undefined, `${final.length} updates from ${memories.length} memories (${method})`);
  return NextResponse.json({ reflected: memories.length, updates: final.map(u => ({ layer: u.layer, key: u.key })), method });
});
