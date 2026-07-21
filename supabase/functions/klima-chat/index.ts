import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  scoreLead,
  resolveRegion,
  SEGMENTS,
  type Segment,
  type Qualification,
} from "../_shared/klima/qualification.ts";
import { buildSystemPrompt } from "./prompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_MODEL = "claude-sonnet-4-5";
const MAX_TOOL_ITERATIONS = 6;
const MAX_HISTORY_MESSAGES = 40; // cap transcript replayed to the model

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

async function callAnthropic(
  apiKey: string,
  system: string,
  messages: AnthropicMessage[],
) {
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
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`Anthropic error ${res.status}: ${text}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return await res.json();
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

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const SLACK_WEBHOOK_URL = Deno.env.get("KLIMA_SLACK_WEBHOOK_URL") || undefined;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || undefined;
    const LEAD_NOTIFY_EMAIL = Deno.env.get("KLIMA_LEAD_NOTIFY_EMAIL") || undefined;
    const LEAD_FROM_EMAIL = Deno.env.get("KLIMA_LEAD_FROM_EMAIL") || "leads@klimapartner-basel.ch";

    const body = await req.json();
    const sessionId: string = body.sessionId;
    const userMessage: string = (body.message ?? "").toString();

    if (!sessionId) {
      return new Response(JSON.stringify({ error: "sessionId erforderlich" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Load or create the conversation ---
    let { data: conv } = await supabase
      .from("klima_conversations")
      .select("id, session_id, segment, qualification, status, lead_score")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (!conv) {
      const { data: created, error } = await supabase
        .from("klima_conversations")
        .insert({ session_id: sessionId })
        .select("id, session_id, segment, qualification, status, lead_score")
        .single();
      if (error) throw error;
      conv = created;
    }
    const conversation = conv as ConversationRow;

    // --- Load prior transcript (text only) ---
    const { data: history } = await supabase
      .from("klima_messages")
      .select("role, content")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true })
      .limit(MAX_HISTORY_MESSAGES);

    const priorMessages: AnthropicMessage[] = (history ?? []).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

    // Returning visitor reopening the widget (empty opener + existing history):
    // the UI has lost its local transcript but the session lives on. Don't call
    // the model with a conversation that ends on an assistant turn — greet back
    // and echo the current qualification state.
    if (!userMessage.trim() && priorMessages.length > 0) {
      const scored = scoreLead(conversation.segment, conversation.qualification || {});
      return new Response(
        JSON.stringify({
          reply:
            "Willkommen zurück! Wie kann ich Ihnen mit Ihrem Klima-Projekt weiterhelfen?",
          segment: conversation.segment,
          leadScore: scored.score,
          tier: scored.tier,
          completion: scored.completion,
          qualified: conversation.status === "qualified" || conversation.status === "handed_off",
          notified: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // First contact (no user message, no history) → let the model greet.
    const messages: AnthropicMessage[] = [...priorMessages];
    if (userMessage.trim()) {
      messages.push({ role: "user", content: userMessage });
      await supabase.from("klima_messages").insert({
        conversation_id: conversation.id,
        role: "user",
        content: userMessage,
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
    let leadSubmitted:
      | null
      | {
          contact_name?: string;
          email?: string;
          phone?: string;
          address?: string;
          summary?: string;
        } = null;

    // --- Tool-use loop ---
    const convo = sanitizeForApi(messages);
    let assistantText = "";
    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const system = buildSystemPrompt({ segment, qualification });
      const data = await callAnthropic(ANTHROPIC_API_KEY, system, convo);

      const content: Array<Record<string, unknown>> = data.content ?? [];
      const textBlocks = content.filter((b) => b.type === "text");
      if (textBlocks.length) {
        assistantText = textBlocks.map((b) => b.text).join("\n").trim();
      }

      const toolUses = content.filter((b) => b.type === "tool_use");
      if (data.stop_reason !== "tool_use" || toolUses.length === 0) {
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
          tool_use_id: tu.id,
          content: JSON.stringify(result),
        });
      }

      // Append assistant tool_use turn + user tool_result turn, then loop.
      convo.push({ role: "assistant", content });
      convo.push({ role: "user", content: toolResults });
    }

    if (!assistantText) {
      assistantText =
        "Entschuldigung, da ist gerade etwas schiefgelaufen. Können Sie das bitte kurz wiederholen?";
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

      let leadId = existingLead?.id;
      if (existingLead) {
        await supabase.from("klima_leads").update(leadPayload).eq("id", existingLead.id);
      } else {
        const { data: inserted } = await supabase
          .from("klima_leads")
          .insert(leadPayload)
          .select("id")
          .single();
        leadId = inserted?.id;
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
    }

    return new Response(
      JSON.stringify({
        reply: assistantText,
        segment,
        leadScore: scored.score,
        tier: scored.tier,
        completion: scored.completion,
        qualified: !!leadSubmitted,
        notified,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("klima-chat error:", e);
    const status = (e as { status?: number } | null)?.status;
    if (status === 429) {
      return new Response(
        JSON.stringify({ error: "Gerade sind viele Anfragen unterwegs — bitte einen Moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
