import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      console.error("LOVABLE_API_KEY not configured");
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

    // Call Lovable AI Gateway (OpenAI-compatible)
    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          max_tokens: 500,
          messages: [
            {
              role: "system",
              content:
                "Du bist ein Lebensmittel-Experte. Analysiere Einkaufsartikel und antworte IMMER als valides JSON ohne Markdown-Formatierung. Keine Erklärungen außerhalb des JSON.",
            },
            {
              role: "user",
              content: `Analysiere: "${artikelName}" (Menge: ${menge || "unbekannt"} ${einheit || ""})\n\nAntworte NUR als JSON:\n{\n  "istLebensmittel": true/false,\n  "kategorie": "Obst|Gemüse|Fleisch & Fisch|Milchprodukte|Backwaren|Getränke|Tiefkühl|Konserven|Haushalt|Technik|Sonstiges",\n  "haltbarkeitTage": Ganzzahl oder null,\n  "erinnerungVorTagen": Ganzzahl oder null,\n  "erklaerung": "Kurze deutsche Erklärung",\n  "lagerhinweis": "Lagerungshinweis oder null"\n}`,
            },
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errText);
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
    const content = aiData.choices?.[0]?.message?.content || "";

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
