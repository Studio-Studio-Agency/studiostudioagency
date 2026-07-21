/**
 * Embeddings via the Supabase Edge runtime's built-in gte-small model
 * (384 dims) — no external API key required. Swap for Voyage/OpenAI here if
 * higher multilingual quality is ever needed; keep dims in sync with the
 * `vector(384)` column and `match_klima_knowledge` in the migration.
 */

interface AiSession {
  run(input: string, opts: { mean_pool: boolean; normalize: boolean }): Promise<number[]>;
}

declare const Supabase: {
  ai: { Session: new (model: string) => AiSession };
};

let session: AiSession | null = null;

export function embeddingsAvailable(): boolean {
  return typeof Supabase !== "undefined" && !!Supabase?.ai?.Session;
}

/** Embed a text. Returns null when the runtime has no AI session (local dev). */
export async function embed(text: string): Promise<number[] | null> {
  if (!embeddingsAvailable()) return null;
  if (!session) session = new Supabase.ai.Session("gte-small");
  const out = await session.run(text.replaceAll("\n", " ").slice(0, 8000), {
    mean_pool: true,
    normalize: true,
  });
  return Array.isArray(out) ? out : null;
}
