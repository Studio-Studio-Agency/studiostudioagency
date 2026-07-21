import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  scoreLead,
  resolveRegion,
  SEGMENTS,
  type Segment,
  type Qualification,
} from "../_shared/klima/qualification.ts";
import { embed } from "../_shared/klima/embeddings.ts";
import { captureServer } from "../_shared/klima/posthog.ts";
import { parsePhotoMarker, isValidPhotoPath } from "../_shared/klima/photos.ts";
import { buildSystemPrompt } from "./prompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_MODEL = "claude-sonnet-4-5";
const MAX_TOOL_ITERATIONS = 6;
const MAX_HISTORY_MESSAGES = 40; // cap transcript replayed to the model

// --- Abuse protection (the endpoint is public and spends API tokens) ---
const MAX_MESSAGE_CHARS = 2000; // longest plausible customer message
const MAX_USER_MESSAGES_PER_CONVERSATION = 60; // hard cap per session
const SESSION_RATE_LIMIT = 15; // user messages ...
const SESSION_RATE_WINDOW_MIN = 10; // ... per this many minutes
const IP_NEW_CONVERSATIONS_PER_HOUR = 6; // new sessions per client IP

// ---------------------------------------------------------------------------
// Anthropic tool schemas
// ---------------------------------------------------------------------------
const tools = [
  {
    name: "set_segment",
    description:
      "Erkanntes Kundensegment festhalten. A = Privat (EFH/ETW), B = Verwaltung/STWEG, C = Gewerbe.",
    input_schema: {
      type: "object",
      properties: {
        segment: { type: "string", enum: ["A", "B", "C"] },
        rationale: { type: "string", description: "Kurze Begründung (intern)" },
      },
      required: ["segment"],
    },
  },
  {
    name: "record_qualification",
    description:
      "Neu erfahrene Qualifizierungs-Fakten speichern. Nur die neuen Felder übergeben. " +
      "Beispiele je Segment: A: property_type, ownership, cooling_scope, area_m2, timeline, " +
      "budget_range, electrical_ready, subsidy_interest. B: units_count, current_hvac, " +
      "decision_process, procurement, tenant_approval, timeline, budget_range. C: space_type, " +
      "area_m2, cooling_need, business_hours_constraint, existing_system, timeline, budget_range. " +
      "Immer wenn bekannt: region (Ort oder Kanton).",
    input_schema: {
      type: "object",
      properties: {
        fields: {
          type: "object",
          description: "Objekt mit neu erfahrenen Feldern, z. B. {\"ownership\":\"Eigentümer\"}",
          additionalProperties: true,
        },
      },
      required: ["fields"],
    },
  },
  {
    name: "search_knowledge",
    description:
      "FAQ-/Wissensdatenbank durchsuchen (Kosten, Förderung, Bewilligung, Technik, Ablauf, " +
      "Lautstärke, Stromverbrauch, Wartung). Nutze dieses Tool, BEVOR du Sachfragen aus dem " +
      "Gedächtnis beantwortest. Antworte auf Basis der Treffer; ohne Treffer antworte " +
      "vorsichtig-allgemein und verweise auf die Offerte des Partners.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Suchanfrage auf Deutsch, z. B. 'Kosten Split-Gerät'" },
      },
      required: ["query"],
    },
  },
  {
    name: "submit_lead",
    description:
      "Qualifizierten Lead mit Kontaktdaten übergeben, damit ein Installationspartner eine " +
      "Offerte erstellen kann. Erst aufrufen, wenn Kontaktdaten UND die Kernfragen vorliegen.",
    input_schema: {
      type: "object",
      properties: {
        contact_name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        address: { type: "string", description: "Adresse oder Ort des Objekts (optional)" },
        summary: { type: "string", description: "1–2 Sätze Zusammenfassung des Anliegens für den Partner" },
      },
      required: ["contact_name"],
    },
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
type AnthropicMessage = { role: "user" | "assistant"; content: unknown };

interface ConversationRow {
  id: string;
  session_id: string;
  segment: Segment | null;
  qualification: Qualification;
  status: string;
  lead_score: number;
}

/**
 * The Anthropic Messages API requires the conversation to start with a `user`
 * turn and to alternate roles. Reconstructed transcripts can violate this — the
 * greeting turn stores only an assistant message, and a partially-failed turn
 * can leave two consecutive user messages. Normalise before sending: drop
 * leading assistant turns and merge consecutive same-role text turns.
 */
function sanitizeForApi(msgs: AnthropicMessage[]): AnthropicMessage[] {
  const out: AnthropicMessage[] = [];
  for (const m of msgs) {
    if (out.length === 0 && m.role === "assistant") continue;
    const last = out[out.length - 1];
    if (
      last &&
      last.role === m.role &&
      typeof last.content === "string" &&
      typeof m.content === "string"
    ) {
      last.content = `${last.content}\n${m.content}`;
    } else {
      out.push({ role: m.role, content: m.content });
    }
  }
  return out;
}

interface StreamResult {
  content: Array<Record<string, unknown>>;
  stopReason: string | null;
}

/**
 * Call Anthropic with `stream: true`, forwarding user-visible text deltas to
 * `onText` as they arrive, while reconstructing the full content blocks (text +
 * tool_use with parsed input) and the stop reason so the tool loop can continue.
 */
async function streamAnthropic(
  apiKey: string,
  system: string,
  messages: AnthropicMessage[],
  onText: (delta: string) => void,
): Promise<StreamResult> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system,
      tools,
      messages,
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    const text = res.body ? await res.text() : "";
    const err = new Error(`Anthropic error ${res.status}: ${text}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const blocks: Array<Record<string, unknown>> = [];
  const toolJson: Record<number, string> = {};
  let stopReason: string | null = null;

  const handleEvent = (evt: Record<string, unknown>) => {
    const type = evt.type as string;
    if (type === "content_block_start") {
      const index = evt.index as number;
      const block = { ...(evt.content_block as Record<string, unknown>) };
      if (block.type === "text" && typeof block.text !== "string") block.text = "";
      if (block.type === "tool_use") toolJson[index] = "";
      blocks[index] = block;
    } else if (type === "content_block_delta") {
      const index = evt.index as number;
      const delta = evt.delta as Record<string, unknown>;
      if (delta.type === "text_delta") {
        const t = delta.text as string;
        const block = blocks[index];
        if (block) block.text = `${(block.text as string) ?? ""}${t}`;
        onText(t);
      } else if (delta.type === "input_json_delta") {
        toolJson[index] = (toolJson[index] ?? "") + (delta.partial_json as string);
      }
    } else if (type === "content_block_stop") {
      const index = evt.index as number;
      const block = blocks[index];
      if (block && block.type === "tool_use") {
        try {
          block.input = toolJson[index] ? JSON.parse(toolJson[index]) : {};
        } catch {
          block.input = {};
        }
      }
    } else if (type === "message_delta") {
      const delta = evt.delta as Record<string, unknown> | undefined;
      if (delta && typeof delta.stop_reason === "string") stopReason = delta.stop_reason;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const dataStr = rawEvent
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trim())
        .join("");
      if (!dataStr || dataStr === "[DONE]") continue;
      try {
        handleEvent(JSON.parse(dataStr));
      } catch {
        // ignore malformed / keep-alive lines
      }
    }
  }

  return { content: blocks.filter(Boolean), stopReason };
}

async function notifyPartners(params: {
  slackUrl?: string;
  resendKey?: string;
  notifyEmail?: string;
  fromEmail: string;
  lead: {
    segment: Segment;
    tier: string;
    score: number;
    region: string | null;
    contact_name?: string;
    email?: string;
    phone?: string;
    address?: string;
    qualification: Qualification;
    summary?: string;
  };
}) {
  const { slackUrl, resendKey, notifyEmail, fromEmail, lead } = params;
  const segLabel = SEGMENTS[lead.segment]?.label ?? lead.segment;
  const qLines = Object.entries(lead.qualification)
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
    .map(([k, v]) => `• ${k}: ${v}`)
    .join("\n");
  const contactLines = [
    lead.contact_name && `Name: ${lead.contact_name}`,
    lead.email && `E-Mail: ${lead.email}`,
    lead.phone && `Telefon: ${lead.phone}`,
    lead.address && `Adresse: ${lead.address}`,
  ]
    .filter(Boolean)
    .join("\n");

  const tasks: Promise<unknown>[] = [];

  if (slackUrl) {
    const emoji = lead.tier === "hot" ? "🔥" : lead.tier === "warm" ? "🌤️" : "❄️";
    const text =
      `${emoji} *Neuer Klima-Lead (${lead.tier.toUpperCase()}, Score ${lead.score})*\n` +
      `*Segment:* ${segLabel}\n*Region:* ${lead.region ?? "—"}\n\n` +
      `*Kontakt*\n${contactLines || "—"}\n\n` +
      (lead.summary ? `*Zusammenfassung*\n${lead.summary}\n\n` : "") +
      `*Qualifizierung*\n${qLines || "—"}`;
    tasks.push(
      fetch(slackUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      }).catch((e) => console.error("Slack notify failed:", e)),
    );
  }

  if (resendKey && notifyEmail) {
    const html =
      `<h2>Neuer Klima-Lead — ${lead.tier.toUpperCase()} (Score ${lead.score})</h2>` +
      `<p><strong>Segment:</strong> ${segLabel}<br/><strong>Region:</strong> ${lead.region ?? "—"}</p>` +
      `<h3>Kontakt</h3><pre>${contactLines || "—"}</pre>` +
      (lead.summary ? `<h3>Zusammenfassung</h3><p>${lead.summary}</p>` : "") +
      `<h3>Qualifizierung</h3><pre>${qLines || "—"}</pre>`;
    tasks.push(
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [notifyEmail],
          subject: `🔔 Klima-Lead ${lead.tier.toUpperCase()} — ${segLabel} (${lead.region ?? "?"})`,
          html,
        }),
      })
        .then(async (r) => {
          if (!r.ok) console.error("Resend notify failed:", r.status, await r.text());
        })
        .catch((e) => console.error("Resend notify failed:", e)),
    );
  }

  await Promise.allSettled(tasks);
}

/** SHA-256 hex of the client IP — pseudonymous key for rate limiting. */
async function hashIp(req: Request): Promise<string | null> {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  if (!ip) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // --- Pre-stream validation (may still return a plain JSON error) ---
  let supabase: ReturnType<typeof createClient>;
  let ANTHROPIC_API_KEY: string;
  let sessionId: string;
  let userMessage: string;
  let SLACK_WEBHOOK_URL: string | undefined;
  let RESEND_API_KEY: string | undefined;
  let LEAD_NOTIFY_EMAIL: string | undefined;
  let LEAD_FROM_EMAIL: string;
  let conversation: ConversationRow;
  let priorMessages: AnthropicMessage[];
  try {
    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) throw new Error("ANTHROPIC_API_KEY not configured");
    ANTHROPIC_API_KEY = key;

    supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    SLACK_WEBHOOK_URL = Deno.env.get("KLIMA_SLACK_WEBHOOK_URL") || undefined;
    RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || undefined;
    LEAD_NOTIFY_EMAIL = Deno.env.get("KLIMA_LEAD_NOTIFY_EMAIL") || undefined;
    LEAD_FROM_EMAIL = Deno.env.get("KLIMA_LEAD_FROM_EMAIL") || "leads@klimapartner-basel.ch";

    const body = await req.json();
    sessionId = body.sessionId;
    userMessage = (body.message ?? "").toString();

    if (!sessionId) {
      return jsonError("sessionId erforderlich", 400);
    }
    if (userMessage.length > MAX_MESSAGE_CHARS) {
      return jsonError("Nachricht zu lang — bitte kürzer fassen.", 400);
    }

    const ipHash = await hashIp(req);

    // --- Load or create the conversation (IP-capped) ---
    const { data: existing } = await supabase
      .from("klima_conversations")
      .select("id, session_id, segment, qualification, status, lead_score")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (existing) {
      conversation = existing as unknown as ConversationRow;
    } else {
      if (ipHash) {
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { count } = await supabase
          .from("klima_conversations")
          .select("id", { count: "exact", head: true })
          .eq("ip_hash", ipHash)
          .gte("created_at", hourAgo);
        if ((count ?? 0) >= IP_NEW_CONVERSATIONS_PER_HOUR) {
          return jsonError(
            "Zu viele neue Gespräche von dieser Verbindung. Bitte versuchen Sie es später erneut.",
            429,
          );
        }
      }
      const { data: created, error } = await supabase
        .from("klima_conversations")
        .insert({ session_id: sessionId, ip_hash: ipHash })
        .select("id, session_id, segment, qualification, status, lead_score")
        .single();
      if (error) throw error;
      conversation = created as unknown as ConversationRow;
    }

    // --- Per-session rate limits (only real user messages count) ---
    if (userMessage.trim()) {
      const { count: total } = await supabase
        .from("klima_messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conversation.id)
        .eq("role", "user");
      if ((total ?? 0) >= MAX_USER_MESSAGES_PER_CONVERSATION) {
        return jsonError(
          "Dieses Gespräch hat sein Limit erreicht. Bitte starten Sie ein neues Gespräch oder kontaktieren Sie uns direkt.",
          429,
        );
      }

      const windowStart = new Date(Date.now() - SESSION_RATE_WINDOW_MIN * 60 * 1000).toISOString();
      const { count: recent } = await supabase
        .from("klima_messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conversation.id)
        .eq("role", "user")
        .gte("created_at", windowStart);
      if ((recent ?? 0) >= SESSION_RATE_LIMIT) {
        return jsonError(
          "Einen Moment bitte — Sie schreiben gerade sehr schnell. Versuchen Sie es in ein paar Minuten erneut.",
          429,
        );
      }
    }

    // --- Load prior transcript (text only) ---
    const { data: history } = await supabase
      .from("klima_messages")
      .select("role, content")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true })
      .limit(MAX_HISTORY_MESSAGES);

    priorMessages = (history ?? []).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content as string,
    }));
  } catch (e) {
    console.error("klima-chat setup error:", e);
    return jsonError(e instanceof Error ? e.message : "Ungültige Anfrage", 400);
  }

  // --- Stream the response as Server-Sent Events ---
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      try {
        // Conversation + prior transcript were loaded (and rate-checked)
        // before the stream opened.

        // Returning visitor reopening the widget (empty opener + existing
        // history): the UI has lost its local transcript but the session lives
        // on. Don't call the model with a conversation that ends on an assistant
        // turn — greet back (streamed as a single token) and echo current state.
        if (!userMessage.trim() && priorMessages.length > 0) {
          const scored = scoreLead(conversation.segment, conversation.qualification || {});
          emit({
            type: "token",
            text: "Willkommen zurück! Wie kann ich Ihnen mit Ihrem Klima-Projekt weiterhelfen?",
          });
          emit({
            type: "done",
            segment: conversation.segment,
            leadScore: scored.score,
            tier: scored.tier,
            completion: scored.completion,
            qualified:
              conversation.status === "qualified" || conversation.status === "handed_off",
            notified: false,
          });
          return;
        }

        // Foto-Marker deterministisch verarbeiten (kein LLM nötig): Pfad
        // validieren (muss zur eigenen Session gehören), fürs Transkript und
        // Modell durch Klartext ersetzen; der Pfad landet in qualification.photos.
        const rawPhotoPath = parsePhotoMarker(userMessage);
        const photoPath =
          rawPhotoPath && isValidPhotoPath(rawPhotoPath, sessionId) ? rawPhotoPath : null;
        if (photoPath) {
          userMessage =
            "[Der Kunde hat soeben ein Foto des Raums hochgeladen. Bestätige den Erhalt " +
            "kurz und nutze es als Anlass für die nächste Qualifizierungsfrage.]";
        } else if (rawPhotoPath) {
          // Marker mit fremdem/ungültigem Pfad: ignorieren statt speichern.
          userMessage = "[Foto-Upload fehlgeschlagen — bitte den Kunden, es erneut zu versuchen.]";
        }

        // First contact (no user message, no history) → let the model greet.
        const messages: AnthropicMessage[] = [...priorMessages];
        if (userMessage.trim()) {
          messages.push({ role: "user", content: userMessage });
          await supabase.from("klima_messages").insert({
            conversation_id: conversation.id,
            role: "user",
            content: photoPath ? "📷 Foto hochgeladen" : userMessage,
          });
        } else if (priorMessages.length === 0) {
          // seed an opener instruction as a user turn so the model produces a greeting
          messages.push({
            role: "user",
            content:
              "[Ein Besucher hat den Chat geöffnet. Begrüsse ihn kurz und freundlich als " +
              "Klima-Berater von Klimapartner Basel und frage, wie du helfen kannst.]",
          });
        }

        // --- Mutable local state that tools update ---
        let segment: Segment | null = conversation.segment;
        const qualification: Qualification = { ...(conversation.qualification || {}) };
        if (photoPath) {
          const prev = Array.isArray(qualification.photos) ? qualification.photos : [];
          qualification.photos = [...prev, photoPath];
        }
        let leadSubmitted:
          | null
          | {
              contact_name?: string;
              email?: string;
              phone?: string;
              address?: string;
              summary?: string;
            } = null;

        // --- Streaming tool-use loop ---
        const convo = sanitizeForApi(messages);
        let fullText = "";
        for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
          const system = buildSystemPrompt({ segment, qualification });
          const { content, stopReason } = await streamAnthropic(
            ANTHROPIC_API_KEY,
            system,
            convo,
            (delta) => {
              fullText += delta;
              emit({ type: "token", text: delta });
            },
          );

          const toolUses = content.filter((b) => b.type === "tool_use");
          if (stopReason !== "tool_use" || toolUses.length === 0) {
            break;
          }

          // Execute each requested tool, collect tool_result blocks.
          const toolResults: Array<Record<string, unknown>> = [];
          for (const tu of toolUses) {
            const name = tu.name as string;
            const input = (tu.input ?? {}) as Record<string, unknown>;
            let result: Record<string, unknown> = { ok: true };

            if (name === "set_segment") {
              const s = input.segment as Segment;
              if (s === "A" || s === "B" || s === "C") segment = s;
              result = { ok: true, segment };
            } else if (name === "record_qualification") {
              const fields = (input.fields ?? {}) as Record<string, unknown>;
              for (const [k, v] of Object.entries(fields)) {
                if (v === null || v === undefined) continue;
                qualification[k] = v as string | number | boolean;
              }
              if (qualification.region) {
                qualification.region = resolveRegion(String(qualification.region));
              }
              const scored = scoreLead(segment, qualification);
              result = {
                ok: true,
                score: scored.score,
                missing_required: scored.missingRequired,
              };
              // Let the UI reflect qualification progress mid-stream.
              emit({
                type: "state",
                segment,
                leadScore: scored.score,
                tier: scored.tier,
                completion: scored.completion,
              });
            } else if (name === "search_knowledge") {
              const query = String(input.query ?? "").trim();
              const vector = query ? await embed(query) : null;
              if (!vector) {
                result = {
                  ok: true,
                  matches: [],
                  note: "Wissensdatenbank nicht verfügbar — antworte vorsichtig-allgemein.",
                };
              } else {
                const { data: matches, error } = await supabase.rpc("match_klima_knowledge", {
                  query_embedding: vector,
                  match_count: 4,
                  min_similarity: 0.5,
                });
                if (error) {
                  console.error("match_klima_knowledge error:", error);
                  result = {
                    ok: true,
                    matches: [],
                    note: "Suche fehlgeschlagen — antworte vorsichtig-allgemein.",
                  };
                } else {
                  result = {
                    ok: true,
                    matches: ((matches ?? []) as Array<Record<string, unknown>>).map((m) => ({
                      title: m.title,
                      content: m.content,
                      category: m.category,
                    })),
                  };
                }
              }
            } else if (name === "submit_lead") {
              leadSubmitted = {
                contact_name: input.contact_name as string,
                email: input.email as string | undefined,
                phone: input.phone as string | undefined,
                address: input.address as string | undefined,
                summary: input.summary as string | undefined,
              };
              if (leadSubmitted.email) qualification.email = leadSubmitted.email;
              if (leadSubmitted.phone) qualification.phone = leadSubmitted.phone;
              const scored = scoreLead(segment, qualification);
              result = { ok: true, tier: scored.tier, score: scored.score };
            } else {
              result = { ok: false, error: `unknown tool ${name}` };
            }

            toolResults.push({
              type: "tool_result",
              tool_use_id: tu.id as string,
              content: JSON.stringify(result),
            });
          }

          // Append assistant tool_use turn + user tool_result turn, then loop.
          convo.push({ role: "assistant", content });
          convo.push({ role: "user", content: toolResults });
        }

        let assistantText = fullText.trim();
        if (!assistantText) {
          assistantText =
            "Entschuldigung, da ist gerade etwas schiefgelaufen. Können Sie das bitte kurz wiederholen?";
          emit({ type: "token", text: assistantText });
        }

        // --- Persist assistant reply ---
        await supabase.from("klima_messages").insert({
          conversation_id: conversation.id,
          role: "assistant",
          content: assistantText,
        });

        // --- Score + persist conversation state ---
        const scored = scoreLead(segment, qualification);
        const region = qualification.region ? String(qualification.region) : null;
        let status = conversation.status === "handed_off" ? "handed_off" : "active";
        if (leadSubmitted) status = "qualified";

        await supabase
          .from("klima_conversations")
          .update({
            segment,
            region,
            qualification,
            lead_score: scored.score,
            status,
          })
          .eq("id", conversation.id);

        // --- Lead upsert + partner notification ---
        let notified = false;
        if (leadSubmitted && segment) {
          const { data: existingLead } = await supabase
            .from("klima_leads")
            .select("id, status, notified_at")
            .eq("conversation_id", conversation.id)
            .maybeSingle();

          const leadPayload = {
            conversation_id: conversation.id,
            segment,
            region,
            contact_name: leadSubmitted.contact_name ?? null,
            email: leadSubmitted.email ?? null,
            phone: leadSubmitted.phone ?? null,
            address: leadSubmitted.address ?? null,
            qualification,
            lead_score: scored.score,
            tier: scored.tier,
          };

          let leadId = existingLead?.id as string | undefined;
          if (existingLead) {
            await supabase.from("klima_leads").update(leadPayload).eq("id", existingLead.id);
          } else {
            const { data: inserted } = await supabase
              .from("klima_leads")
              .insert(leadPayload)
              .select("id")
              .single();
            leadId = inserted?.id as string | undefined;
          }

          // Notify once, only for reachable, in-region, non-cold leads.
          const alreadyNotified = !!existingLead?.notified_at;
          const reachable = !!(leadSubmitted.email || leadSubmitted.phone);
          if (!alreadyNotified && reachable && scored.tier !== "cold" && region && region !== "other") {
            await notifyPartners({
              slackUrl: SLACK_WEBHOOK_URL,
              resendKey: RESEND_API_KEY,
              notifyEmail: LEAD_NOTIFY_EMAIL,
              fromEmail: LEAD_FROM_EMAIL,
              lead: {
                segment,
                tier: scored.tier,
                score: scored.score,
                region,
                contact_name: leadSubmitted.contact_name,
                email: leadSubmitted.email,
                phone: leadSubmitted.phone,
                address: leadSubmitted.address,
                qualification,
                summary: leadSubmitted.summary,
              },
            });
            if (leadId) {
              await supabase
                .from("klima_leads")
                .update({ status: "notified", notified_at: new Date().toISOString() })
                .eq("id", leadId);
            }
            notified = true;
          }

          // Serverseitige Funnel-Events (Adblocker-immun); nur beim ersten Mal.
          if (!existingLead) {
            await captureServer("klima_lead_submitted", sessionId, {
              segment,
              tier: scored.tier,
              score: scored.score,
              region,
            });
          }
          if (notified) {
            await captureServer("klima_lead_notified", sessionId, {
              segment,
              tier: scored.tier,
              score: scored.score,
              region,
            });
          }
        }

        emit({
          type: "done",
          segment,
          leadScore: scored.score,
          tier: scored.tier,
          completion: scored.completion,
          qualified: !!leadSubmitted,
          notified,
        });
      } catch (e) {
        console.error("klima-chat stream error:", e);
        const status = (e as { status?: number } | null)?.status;
        const msg =
          status === 429
            ? "Gerade sind viele Anfragen unterwegs — bitte einen Moment."
            : e instanceof Error
              ? e.message
              : "Unbekannter Fehler";
        emit({ type: "error", error: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});
