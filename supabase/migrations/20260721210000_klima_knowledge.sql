-- Klimapartner Basel — FAQ / product knowledge base (pgvector)
--
-- Searched at chat time by the `klima-chat` edge function via the
-- `search_knowledge` tool; maintained via the `klima-knowledge` edge function.
-- Embeddings: gte-small (384 dims), computed in the Supabase Edge runtime.
-- Same access model as the lead tables: RLS on, no anon policies,
-- service-role only.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE public.klima_knowledge (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text NOT NULL UNIQUE,           -- upsert key for re-ingestion
  content    text NOT NULL,
  category   text,                           -- 'kosten' | 'foerderung' | 'technik' | 'ablauf' | ...
  lang       text NOT NULL DEFAULT 'de',
  embedding  vector(384),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX klima_knowledge_embedding_idx
  ON public.klima_knowledge USING hnsw (embedding vector_cosine_ops);

ALTER TABLE public.klima_knowledge ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_klima_knowledge_updated_at
  BEFORE UPDATE ON public.klima_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Cosine-similarity search used by the chat bot.
CREATE OR REPLACE FUNCTION public.match_klima_knowledge(
  query_embedding vector(384),
  match_count     int   DEFAULT 4,
  min_similarity  float DEFAULT 0.5
)
RETURNS TABLE (id uuid, title text, content text, category text, similarity float)
LANGUAGE sql STABLE AS $$
  SELECT k.id, k.title, k.content, k.category,
         1 - (k.embedding <=> query_embedding) AS similarity
  FROM public.klima_knowledge k
  WHERE k.embedding IS NOT NULL
    AND 1 - (k.embedding <=> query_embedding) >= min_similarity
  ORDER BY k.embedding <=> query_embedding
  LIMIT match_count;
$$;
