import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Admin API for the Klimapartner lead dashboard.
 *
 * The lead tables are service-role only (RLS, no policies) — this function is
 * the sole read/write path for staff. Access requires BOTH:
 *   1. a valid Supabase user JWT (config.toml: verify_jwt = true), and
 *   2. the user's email being listed in KLIMA_ADMIN_EMAILS (comma-separated).
 *
 * POST { action: "list" }                              → { leads, conversationCount }
 * POST { action: "conversation", conversationId }      → { messages }
 * POST { action: "update_status", leadId, status }     → { ok }
 * POST { action: "photo_urls", paths }                 → { urls } (Signed URLs, 1 h)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LEAD_STATUSES = ["new", "notified", "assigned", "won", "lost"];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const adminEmails = (Deno.env.get("KLIMA_ADMIN_EMAILS") ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    // Resolve the calling user from their JWT.
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    const email = user?.email?.toLowerCase();

    if (!email || adminEmails.length === 0 || !adminEmails.includes(email)) {
      return json({ error: "Kein Zugriff" }, 403);
    }

    const db = createClient(supabaseUrl, serviceKey);
    const body = await req.json();

    if (body.action === "list") {
      const { data: leads, error } = await db
        .from("klima_leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;

      const { count: conversationCount } = await db
        .from("klima_conversations")
        .select("id", { count: "exact", head: true });

      return json({ leads: leads ?? [], conversationCount: conversationCount ?? 0 });
    }

    if (body.action === "conversation") {
      const conversationId = String(body.conversationId ?? "");
      if (!conversationId) return json({ error: "conversationId erforderlich" }, 400);
      const { data: messages, error } = await db
        .from("klima_messages")
        .select("role, content, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return json({ messages: messages ?? [] });
    }

    if (body.action === "update_status") {
      const leadId = String(body.leadId ?? "");
      const status = String(body.status ?? "");
      if (!leadId || !LEAD_STATUSES.includes(status)) {
        return json({ error: "Ungültige Parameter" }, 400);
      }
      const { error } = await db.from("klima_leads").update({ status }).eq("id", leadId);
      if (error) throw error;
      return json({ ok: true });
    }

    if (body.action === "photo_urls") {
      const paths: string[] = Array.isArray(body.paths)
        ? body.paths.filter((p: unknown) => typeof p === "string").slice(0, 20)
        : [];
      if (paths.length === 0) return json({ urls: {} });
      const { data, error } = await db.storage
        .from("klima-photos")
        .createSignedUrls(paths, 60 * 60);
      if (error) throw error;
      const urls: Record<string, string> = {};
      for (const item of data ?? []) {
        if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
      }
      return json({ urls });
    }

    return json({ error: "Unbekannte Aktion" }, 400);
  } catch (e) {
    console.error("klima-admin error:", e);
    return json({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }, 500);
  }
});
