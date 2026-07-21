-- Klimapartner Basel — Lead qualification chatbot schema
--
-- The bot runs unauthenticated (public lead-gen widget). All writes go through
-- the `klima-chat` edge function using the service-role key, which bypasses RLS.
-- RLS is therefore enabled with NO anon/authenticated policies: no browser client
-- can read or write lead data directly. Sales/partner staff read via the Supabase
-- dashboard or a service-role backend.

-- ---------------------------------------------------------------------------
-- Conversations: one row per chat session
-- ---------------------------------------------------------------------------
CREATE TABLE public.klima_conversations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     text NOT NULL UNIQUE,
  segment        text,                              -- 'A' | 'B' | 'C' (null until detected)
  language       text NOT NULL DEFAULT 'de',        -- 'de' | 'fr' | 'gsw'
  region         text,                              -- detected target region
  status         text NOT NULL DEFAULT 'active',    -- 'active' | 'qualified' | 'handed_off' | 'abandoned'
  lead_score     integer NOT NULL DEFAULT 0,        -- 0-100
  qualification  jsonb NOT NULL DEFAULT '{}'::jsonb, -- accumulated structured answers
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX klima_conversations_status_idx  ON public.klima_conversations (status);
CREATE INDEX klima_conversations_segment_idx ON public.klima_conversations (segment);

ALTER TABLE public.klima_conversations ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_klima_conversations_updated_at
  BEFORE UPDATE ON public.klima_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Messages: full transcript, for analytics + partner handoff context
-- ---------------------------------------------------------------------------
CREATE TABLE public.klima_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.klima_conversations (id) ON DELETE CASCADE,
  role            text NOT NULL,                    -- 'user' | 'assistant'
  content         text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX klima_messages_conversation_idx ON public.klima_messages (conversation_id, created_at);

ALTER TABLE public.klima_messages ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Leads: a qualified prospect ready to hand to an installation partner
-- ---------------------------------------------------------------------------
CREATE TABLE public.klima_leads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL UNIQUE REFERENCES public.klima_conversations (id) ON DELETE CASCADE,
  segment         text NOT NULL,                    -- 'A' | 'B' | 'C'
  region          text,                             -- 'BS' | 'BL' | 'AG' | 'SO' | 'other'
  contact_name    text,
  email           text,
  phone           text,
  address         text,
  qualification   jsonb NOT NULL DEFAULT '{}'::jsonb,
  lead_score      integer NOT NULL DEFAULT 0,       -- 0-100
  tier            text NOT NULL DEFAULT 'cold',     -- 'hot' | 'warm' | 'cold'
  status          text NOT NULL DEFAULT 'new',      -- 'new' | 'notified' | 'assigned' | 'won' | 'lost'
  notified_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX klima_leads_tier_idx   ON public.klima_leads (tier);
CREATE INDEX klima_leads_status_idx ON public.klima_leads (status);
CREATE INDEX klima_leads_region_idx ON public.klima_leads (region);

ALTER TABLE public.klima_leads ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_klima_leads_updated_at
  BEFORE UPDATE ON public.klima_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
