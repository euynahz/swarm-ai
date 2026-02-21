/* embedding.ts — OpenAI-compatible embedding API, graceful fallback */
const EMBED_URL = process.env.EMBED_URL || '';
const EMBED_KEY = process.env.EMBED_KEY || '';
const EMBED_MODEL = process.env.EMBED_MODEL || 'text-embedding-3-small';

export const embeddingEnabled = !!(EMBED_URL && EMBED_KEY);

export async function embed(text: string): Promise<number[]> {
  if (!embeddingEnabled) return [];
  const res = await fetch(EMBED_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${EMBED_KEY}` },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  });
  if (!res.ok) throw new Error(`Embedding API ${res.status}`);
  const data = await res.json();
  return data.data[0].embedding;
}

export function cosine(a: number[], b: number[]): number {
  if (!a.length || !b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

export function getEmbeddingConfig() {
  return { url: EMBED_URL, model: EMBED_MODEL, enabled: embeddingEnabled };
}
