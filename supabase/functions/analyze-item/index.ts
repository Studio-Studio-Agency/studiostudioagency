import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { artikelName, menge, einheit, itemId } = await req.json();

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Nicht authentifiziert" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Nicht authentifiziert" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting: max 30 analyses per user per hour
    const RATE_LIMIT = 30;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabase
      .from("items")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("checked_at", oneHourAgo);

    if (!countError && (count ?? 0) >= RATE_LIMIT) {
      return new Response(
        JSON.stringify({
          error: "rate_limit",
          message: `Maximal ${RATE_LIMIT} Analysen pro Stunde. Bitte warte etwas.`,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      console.error("ANTHROPIC_API_KEY not configured");
      return new Response(
        JSON.stringify({
          error: "config_error",
          message: "KI-Service ist nicht konfiguriert.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Call Anthropic Claude API directly
    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        system:
          "Du bist ein Lebensmittel-Experte. Analysiere Einkaufsartikel und antworte IMMER als valides JSON ohne Markdown-Formatierung. Keine Erklärungen außerhalb des JSON.",
        messages: [
          {
            role: "user",
            content: `Analysiere: "${artikelName}" (Menge: ${menge || "unbekannt"} ${einheit || ""})\n\nAntworte NUR als JSON:\n{\n  "istLebensmittel": true/false,\n  "kategorie": "Obst & Früchte|Gemüse & Salat|Fleisch & Fisch|Milchprodukte|Backwaren|Getränke|Tiefkühl|Konserven & Vorrat|Gewürze & Saucen|Snacks & Süsses|Frühstück & Cerealien|Haushalt & Reinigung|Pflege & Hygiene|Baby & Kind|Tierbedarf|Technik & Elektronik|Sonstiges",\n  "haltbarkeitTage": Ganzzahl oder null,\n  "erinnerungVorTagen": Ganzzahl oder null,\n  "erklaerung": "Kurze deutsche Erklärung",\n  "lagerhinweis": "Lagerungshinweis oder null"\n}`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("Anthropic API error:", aiResponse.status, errText);

      if (aiResponse.status === 401) {
        return new Response(
          JSON.stringify({
            error: "auth_error",
            message: "Ungültiger API Key. Bitte prüfe deinen Anthropic API Key.",
          }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({
            error: "rate_limit",
            message: "API Rate Limit erreicht. Bitte versuche es gleich erneut.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          error: "api_error",
          message: "KI-Analyse fehlgeschlagen. Bitte versuche es erneut.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.content?.[0]?.text || "";

    // Parse JSON from response
    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({
          error: "parse_error",
          message: "KI-Antwort konnte nicht verarbeitet werden.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Calculate expiry date
    let ablaufDatum = null;
    if (analysis.haltbarkeitTage && analysis.istLebensmittel) {
      const date = new Date();
      date.setDate(date.getDate() + analysis.haltbarkeitTage);
      ablaufDatum = date.toISOString().split("T")[0];
    }

    // Update item in database
    const { error: updateError } = await supabase
      .from("items")
      .update({
        ist_lebensmittel: analysis.istLebensmittel,
        kategorie: analysis.kategorie,
        haltbarkeit_tage: analysis.haltbarkeitTage,
        erinnerung_vor_tagen: analysis.erinnerungVorTagen,
        ablauf_datum: ablaufDatum,
        erklaerung: analysis.erklaerung,
        lagerhinweis: analysis.lagerhinweis,
      })
      .eq("id", itemId)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("DB update error:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: {
          ...analysis,
          ablaufDatum,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("analyze-item error:", e);
    return new Response(
      JSON.stringify({
        error: "server_error",
        message: e instanceof Error ? e.message : "Unbekannter Fehler",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
