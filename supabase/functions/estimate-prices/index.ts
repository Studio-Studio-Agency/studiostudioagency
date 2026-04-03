import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const REGION_CONFIG: Record<string, { currency: string; stores: string; country: string }> = {
  CH: { currency: "CHF", stores: "Migros, Coop, Aldi Suisse, Lidl Schweiz, Denner, Spar", country: "Schweiz" },
  DE: { currency: "EUR", stores: "Aldi, Lidl, REWE, Edeka, Penny, Netto, Kaufland", country: "Deutschland" },
  AT: { currency: "EUR", stores: "Hofer, Spar, Billa, Lidl Österreich, Penny, Unimarkt", country: "Österreich" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { product, region } = await req.json();

    if (!product || typeof product !== "string" || product.trim().length < 1) {
      return new Response(
        JSON.stringify({ error: "Produktname fehlt" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const regionKey = (region && typeof region === "string" && REGION_CONFIG[region]) ? region : "CH";
    const regionInfo = REGION_CONFIG[regionKey];
    const productKey = `${product.trim().toLowerCase()}_${regionKey}`;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check cache first (entries younger than 7 days)
    const { data: cached } = await supabase
      .from("price_estimate_cache")
      .select("*")
      .eq("product_key", productKey)
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .maybeSingle();

    if (cached) {
      return new Response(
        JSON.stringify({
          product_name: cached.product_name,
          currency: cached.currency,
          estimates: cached.estimates,
          tip: cached.tip,
          cheapest_price: cached.cheapest_price,
          cheapest_store: cached.cheapest_store,
          cached: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI nicht konfiguriert" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `Du bist ein Preisexperte für Lebensmittel und Produkte in ${regionInfo.country}.
Gib für das genannte Produkt geschätzte Preise bei folgenden Geschäften zurück: ${regionInfo.stores}.
Nutze dein Wissen über typische Preise (Stand 2024/2025). Die Währung ist ${regionInfo.currency}.
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
              description: "Gibt geschätzte Preise für ein Produkt bei Supermärkten zurück.",
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
                        store: { type: "string" },
                        price_low: { type: "number" },
                        price_high: { type: "number" },
                        unit: { type: "string" },
                        note: { type: "string" },
                      },
                      required: ["store", "price_low", "price_high", "unit"],
                      additionalProperties: false,
                    },
                  },
                  tip: { type: "string", description: "Optionaler Spartipp" },
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

    // Find cheapest
    const estimates = priceData.estimates || [];
    let cheapestPrice: number | null = null;
    let cheapestStore: string | null = null;
    for (const est of estimates) {
      if (cheapestPrice === null || est.price_low < cheapestPrice) {
        cheapestPrice = est.price_low;
        cheapestStore = est.store;
      }
    }

    // Upsert cache
    await supabase.from("price_estimate_cache").upsert(
      {
        product_key: productKey,
        product_name: priceData.product_name,
        currency: priceData.currency,
        estimates: estimates,
        tip: priceData.tip || null,
        cheapest_price: cheapestPrice,
        cheapest_store: cheapestStore,
        created_at: new Date().toISOString(),
      },
      { onConflict: "product_key" }
    );

    return new Response(
      JSON.stringify({
        ...priceData,
        cheapest_price: cheapestPrice,
        cheapest_store: cheapestStore,
      }),
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
