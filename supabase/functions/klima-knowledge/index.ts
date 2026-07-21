import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { embed, embeddingsAvailable } from "../_shared/klima/embeddings.ts";
import { SEED_ENTRIES, type KnowledgeEntry } from "./seed-data.ts";

/**
 * Admin ingestion for the Klimapartner knowledge base.
 *
 * Protected: config.toml sets verify_jwt = true AND we additionally require the
 * service-role key as Bearer token, so neither anon nor ordinary user JWTs can
 * write knowledge.
 *
 * POST { seed: true }                      → upsert the built-in sample entries
 * POST { entries: [{title, content, …}] }  → upsert custom entries
 *
 * Upsert key is `title` (unique) — re-ingesting updates content + embedding.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${serviceKey}`) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!embeddingsAvailable()) {
      return new Response(
        JSON.stringify({ error: "Embedding runtime (Supabase.ai) not available" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
    const body = await req.json();

    const entries: KnowledgeEntry[] = body.seed ? SEED_ENTRIES : (body.entries ?? []);
    if (!Array.isArray(entries) || entries.length === 0) {
      return new Response(
        JSON.stringify({ error: "Pass { seed: true } or { entries: [...] }" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let upserted = 0;
    const failures: string[] = [];
    for (const e of entries) {
      if (!e?.title?.trim() || !e?.content?.trim()) {
        failures.push(`invalid entry: ${JSON.stringify(e).slice(0, 80)}`);
        continue;
      }
      const embedding = await embed(`${e.title}\n${e.content}`);
      if (!embedding) {
        failures.push(`embedding failed: ${e.title}`);
        continue;
      }
      const { error } = await supabase.from("klima_knowledge").upsert(
        {
          title: e.title.trim(),
          content: e.content.trim(),
          category: e.category ?? null,
          lang: e.lang ?? "de",
          embedding,
        },
        { onConflict: "title" },
      );
      if (error) {
        failures.push(`${e.title}: ${error.message}`);
      } else {
        upserted++;
      }
    }

    return new Response(JSON.stringify({ upserted, failures }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("klima-knowledge error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
