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
    const body = await req.json();
    const { action } = body;

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
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Nicht authentifiziert" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: analyze - just run AI, return items without saving
    if (action === "analyze") {
      const { imageBase64 } = body;
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        return new Response(
          JSON.stringify({ error: "config_error", message: "AI-Service nicht konfiguriert." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `Du bist ein Experte für Einkaufszettel und Kassenbons. Analysiere das Bild und extrahiere alle Produkte/Artikel.

Für jeden Artikel bestimme:
- name: Produktname (bereinigt, ohne Preis)
- menge: Anzahl/Menge als Zahl oder null
- einheit: Einheit (Stk, kg, g, l, ml, etc.) oder null
- kategorie: Eine von: Obst & Früchte, Gemüse & Salat, Fleisch & Fisch, Milchprodukte, Backwaren, Getränke, Tiefkühl, Konserven & Vorrat, Gewürze & Saucen, Snacks & Süsses, Frühstück & Cerealien, Haushalt & Reinigung, Pflege & Hygiene, Baby & Kind, Tierbedarf, Technik & Elektronik, Sonstiges
- istLebensmittel: true/false
- haltbarkeitTage: geschätzte Haltbarkeit in Tagen oder null
- erinnerungVorTagen: Erinnerung X Tage vor Ablauf oder null
- lagerhinweis: kurzer Lagerungshinweis oder null
- erklaerung: kurze Beschreibung/Info zum Produkt oder null

Antworte NUR als valides JSON-Array. Keine Markdown-Formatierung, kein Text davor oder danach.`
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
                },
                {
                  type: "text",
                  text: "Analysiere diesen Einkaufszettel/Kassenbon und extrahiere alle Artikel als JSON-Array.",
                },
              ],
            },
          ],
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("AI gateway error:", aiResponse.status, errText);
        if (aiResponse.status === 429) {
          return new Response(
            JSON.stringify({ error: "rate_limit", message: "Zu viele Anfragen. Bitte warte kurz." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (aiResponse.status === 402) {
          return new Response(
            JSON.stringify({ error: "payment_required", message: "AI-Kontingent aufgebraucht." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ error: "api_error", message: "KI-Analyse fehlgeschlagen." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || "";

      let items: any[];
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        items = JSON.parse(jsonMatch ? jsonMatch[0] : content);
      } catch {
        console.error("Failed to parse AI response:", content);
        return new Response(
          JSON.stringify({ error: "parse_error", message: "Konnte den Bon nicht lesen. Bitte versuche ein schärferes Foto." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!Array.isArray(items) || items.length === 0) {
        return new Response(
          JSON.stringify({ error: "no_items", message: "Keine Artikel auf dem Bon erkannt." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, items }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: save - save edited items to a new list
    if (action === "save") {
      const { listName, items } = body;

      if (!Array.isArray(items) || items.length === 0) {
        return new Response(
          JSON.stringify({ error: "no_items", message: "Keine Artikel zum Speichern." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const finalListName = listName?.trim() || `Einkauf ${new Date().toLocaleDateString("de-CH")}`;
      const { data: listData, error: listError } = await supabase
        .from("lists")
        .insert({ name: finalListName, user_id: user.id })
        .select("id")
        .single();

      if (listError || !listData) {
        console.error("List creation error:", listError);
        return new Response(
          JSON.stringify({ error: "db_error", message: "Liste konnte nicht erstellt werden." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const now = new Date().toISOString();
      const dbItems = items.map((item: any) => {
        let ablaufDatum = null;
        if (item.haltbarkeitTage && item.istLebensmittel) {
          const date = new Date();
          date.setDate(date.getDate() + item.haltbarkeitTage);
          ablaufDatum = date.toISOString().split("T")[0];
        }

        return {
          list_id: listData.id,
          user_id: user.id,
          name: item.name,
          menge: item.menge || null,
          einheit: item.einheit || null,
          is_checked: true,
          checked_at: now,
          ist_lebensmittel: item.istLebensmittel ?? null,
          kategorie: item.kategorie || null,
          haltbarkeit_tage: item.haltbarkeitTage || null,
          erinnerung_vor_tagen: item.erinnerungVorTagen || null,
          ablauf_datum: ablaufDatum,
          erklaerung: item.erklaerung || null,
          lagerhinweis: item.lagerhinweis || null,
        };
      });

      const { error: insertError } = await supabase.from("items").insert(dbItems);
      if (insertError) {
        console.error("Items insert error:", insertError);
        return new Response(
          JSON.stringify({ error: "db_error", message: "Artikel konnten nicht gespeichert werden." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          listId: listData.id,
          listName: finalListName,
          itemCount: items.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "unknown_action", message: "Unbekannte Aktion." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("scan-receipt error:", e);
    return new Response(
      JSON.stringify({
        error: "server_error",
        message: e instanceof Error ? e.message : "Unbekannter Fehler",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
