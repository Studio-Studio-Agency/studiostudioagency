# Klimapartner Basel — Lead-Qualification Chatbot

A concierge-style chat that qualifies air-conditioning leads for **Klimapartner
Basel** (a general-contractor / broker that routes ready-to-close prospects to
vetted installation partners in **Basel-Stadt, Basel-Landschaft, Aargau,
Solothurn**).

The bot talks like a knowledgeable Klimatechniker — German-first (with Swiss
German understanding and French fallback), adaptive rather than a linear form —
and detects the customer segment early:

| Segment | Who | Key qualification |
|---------|-----|-------------------|
| **A** | Private homeowners (EFH / ETW) | property type, owner vs. tenant, cooling scope, timeline, budget, electrical readiness, subsidies |
| **B** | Property management / STWEG | unit count, current HVAC, decision process, procurement, timeline |
| **C** | Commercial (office, retail, gastro, practice) | space type, area m², cooling need, business-hours constraint, timeline, budget |

## Architecture

This repo is a **Vite + React + Supabase** app (not Next.js), so the chatbot is
built on the stack's established patterns:

- **UI** — `src/pages/KlimapartnerPage.tsx` (public route `/klimapartner`) hosting
  `src/components/klima/KlimaChat.tsx`, driven by the `useKlimaChat` hook.
- **Backend** — `supabase/functions/klima-chat` (Deno edge function) calling the
  **Anthropic Claude API (`claude-sonnet-4-5`) with tool use**. Established
  backend pattern here is Supabase Edge Functions; there is no Next.js API layer.
- **Domain logic** — `src/lib/klima/qualification.ts` (segments, regions,
  deterministic lead scoring), unit-tested and mirrored for Deno at
  `supabase/functions/_shared/klima/qualification.ts` (**keep both in sync**).
- **Persistence** — `klima_conversations`, `klima_messages`, `klima_leads`
  (migration `supabase/migrations/20260721120000_klimapartner_leads.sql`).
- **Notifications** — Slack webhook + Resend email fired when a qualified,
  reachable, in-region lead is submitted.

### Tools exposed to Claude

| Tool | Effect |
|------|--------|
| `set_segment` | records detected segment (A/B/C) |
| `record_qualification` | merges newly-learned facts into `qualification` (region normalized) |
| `search_knowledge` | pgvector similarity search over the FAQ knowledge base |
| `submit_lead` | creates/updates `klima_leads`, scores + tiers it, notifies partners |

The model never re-asks known facts: accumulated `qualification` and the detected
segment are injected into the system prompt each turn.

### Lead scoring

`scoreLead()` combines required-field completeness + buying signals (timeline
urgency, decision authority, serviced region, reachable contact, budget) into a
0–100 score and a tier: **hot** (≥70), **warm** (≥45), **cold**. Out-of-region
leads are never scored `hot` (no partner to route to). See
`src/lib/klima/qualification.test.ts`.

## Setup

1. **Migration** — apply `supabase/migrations/20260721120000_klimapartner_leads.sql`
   (`supabase db push` or via the dashboard). RLS is enabled with no anon
   policies; all access is service-role (edge function) only.

2. **Secrets** — set on the Supabase project (see `.env.example`):
   ```bash
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   supabase secrets set KLIMA_SLACK_WEBHOOK_URL=https://hooks.slack.com/...
   supabase secrets set RESEND_API_KEY=re_...
   supabase secrets set KLIMA_LEAD_NOTIFY_EMAIL=leads@klimapartner-basel.ch
   supabase secrets set KLIMA_LEAD_FROM_EMAIL=leads@klimapartner-basel.ch
   ```
   Slack/Resend are optional — omit either to disable that channel.

3. **Deploy the function**:
   ```bash
   supabase functions deploy klima-chat
   ```
   (`verify_jwt = false` in `supabase/config.toml` — the widget is unauthenticated.)

4. **Frontend** — no new build vars; visit `/klimapartner`.

## Token streaming

Replies stream token-by-token. The edge function calls Anthropic with
`stream: true` and re-emits the response as **Server-Sent Events**
(`Content-Type: text/event-stream`); tool calls are still resolved server-side
inside the same request. Event types:

| Event | Payload | Meaning |
|-------|---------|---------|
| `token` | `{ text }` | append to the current assistant message |
| `state` | `{ segment, leadScore, tier, completion }` | mid-stream qualification progress (after `record_qualification`) |
| `done` | `{ segment, leadScore, tier, completion, qualified, notified }` | final state; stream ends |
| `error` | `{ error }` | failure (message already localized) |

The browser reads the stream with `fetch` + `ReadableStream.getReader()` in
`useKlimaChat` (not `supabase.functions.invoke`, which buffers the whole body).
Pre-stream failures (bad body, missing `sessionId`, rate limits) still return a
plain JSON error with the appropriate status code.

## Abuse protection

The endpoint is public and spends Anthropic tokens, so it enforces DB-backed
limits **before** opening the stream (plain `400`/`429` JSON errors):

| Limit | Value | Keyed on |
|-------|-------|----------|
| Message length | 2 000 chars | request body |
| Message rate | 15 user messages / 10 min | conversation |
| Conversation cap | 60 user messages total | conversation |
| New conversations | 6 / hour | SHA-256 of client IP (`ip_hash`, no raw PII) |

Constants live at the top of `supabase/functions/klima-chat/index.ts`.

## FAQ knowledge base (pgvector)

The bot grounds factual answers (Kosten, Förderung, Bewilligung, Technik, …)
in a pgvector knowledge base instead of improvising:

- **Schema** — migration `20260721210000_klima_knowledge.sql`: `vector`
  extension, `klima_knowledge` table (`vector(384)` embeddings, HNSW index),
  and the `match_klima_knowledge(query_embedding, match_count, min_similarity)`
  cosine-search function. RLS on, service-role only.
- **Embeddings** — the Supabase Edge runtime's built-in `gte-small` model
  (`_shared/klima/embeddings.ts`), so no extra API key is needed. If the AI
  session is unavailable (e.g. local dev), search degrades gracefully and the
  prompt tells the model to answer conservatively.
- **Chat integration** — the `search_knowledge` tool; the system prompt
  instructs the model to search before answering factual questions and never
  to invent figures that aren't in the results.
- **Ingestion** — edge function `klima-knowledge` (requires the service-role
  key as Bearer token):

  ```bash
  supabase functions deploy klima-knowledge
  # seed the built-in sample entries
  curl -X POST "$SUPABASE_URL/functions/v1/klima-knowledge" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d '{"seed": true}'
  # or upsert custom entries (title is the upsert key)
  curl -X POST "$SUPABASE_URL/functions/v1/klima-knowledge" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d '{"entries": [{"title": "…", "content": "…", "category": "kosten"}]}'
  ```

  ⚠️ The seed entries in `klima-knowledge/seed-data.ts` are deliberately
  hedged **sample content** — review and replace with verified figures and
  current cantonal rules before go-live.

## CI

`.github/workflows/ci.yml` runs on every PR: `npm ci`, type-check, tests, a
lint pass scoped to the chatbot code (full-repo lint has pre-existing errors on
`main`), and the production build.

## Notes & possible follow-ups

- Google Places address validation, room-photo uploads to Supabase Storage,
  PostHog funnel events, and an internal leads dashboard are scoped out of this
  slice and can layer onto the same conversation/lead tables.
