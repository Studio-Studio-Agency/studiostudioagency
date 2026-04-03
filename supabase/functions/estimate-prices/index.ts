import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { product } = await req.json();

    if (!product || typeof product !== "string" || product.trim().length < 1) {
      return new Response(
        JSON.stringify({ error: "Produktname fehlt" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI nicht konfiguriert" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `Du bist ein Preisexperte für Lebensmittel und Produkte in der DACH-Region (Deutschland, Österreich, Schweiz).
Gib für das genannte Produkt geschätzte Preise bei verschiedenen Discountern und Supermärkten zurück.
Nutze dein Wissen über typische Preise (Stand 2024/2025). Markiere Preise als Schätzungen.
Antworte NUR mit dem Tool-Call, keine weiteren Erklärungen.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Produkt: "${product.trim()}"` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "price_estimates",
              description: "Gibt geschätzte Preise für ein Produkt bei DACH-Supermärkten zurück.",
              parameters: {
                type: "object",
                properties: {
                  product_name: { type: "string", description: "Normalisierter Produktname" },
                  currency: { type: "string", enum: ["EUR", "CHF"] },
                  estimates: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        store: { type: "string", description: "Name des Geschäfts (z.B. Aldi, Lidl, Migros, Coop, REWE, Edeka, Denner, Hofer)" },
                        price_low: { type: "number", description: "Untere Preisschätzung in der jeweiligen Währung" },
                        price_high: { type: "number", description: "Obere Preisschätzung in der jeweiligen Währung" },
                        unit: { type: "string", description: "Einheit, z.B. 'pro Stück', 'pro kg', 'pro 500g', 'pro Packung'" },
                        note: { type: "string", description: "Optionaler Hinweis, z.B. 'Eigenmarke' oder 'Bio'" },
                      },
                      required: ["store", "price_low", "price_high", "unit"],
                      additionalProperties: false,
                    },
                  },
                  tip: { type: "string", description: "Optionaler Spartipp für dieses Produkt" },
                },
                required: ["product_name", "currency", "estimates"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "price_estimates" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Zu viele Anfragen, bitte später erneut versuchen." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI-Kontingent aufgebraucht." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: "Preisschätzung fehlgeschlagen" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "Keine Preisdaten erhalten" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const priceData = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify(priceData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("estimate-prices error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
