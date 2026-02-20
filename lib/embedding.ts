/* embedding.ts — Qwen3-Embedding via OpenAI-compatible API */
const EMBED_URL = process.env.EMBED_URL || 'http://192.168.11.40:4000/v1/embeddings';
const EMBED_KEY = process.env.EMBED_KEY || 'sk-OwoAW7jb9BDL2B06oX6WWw';
const EMBED_MODEL = process.env.EMBED_MODEL || 'Qwen3-Embedding';

export async function embed(text: string): Promise<number[]> {
  const res = await fetch(EMBED_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${EMBED_KEY}` },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  });
  const data = await res.json();
  return data.data[0].embedding;
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}
