const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the recipe page
    console.log('Fetching recipe from:', url);
    const pageResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GoodGoods/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
      },
    });

    if (!pageResponse.ok) {
      return new Response(
        JSON.stringify({ success: false, error: `Seite konnte nicht geladen werden (${pageResponse.status})` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await pageResponse.text();

    // Extract text content - strip tags for cleaner AI input
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 8000); // Limit to avoid token limits

    // Use Lovable AI to extract ingredients
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await fetch('https://ai-gateway.lovable.dev/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Du bist ein Experte für Rezepte. Extrahiere alle Zutaten aus dem folgenden Webseitentext.
Gib NUR ein JSON-Array zurück, ohne Markdown-Formatierung.
Jedes Element hat: {"name": "Artikelname", "menge": number|null, "einheit": "string"|null}
Beispiel: [{"name": "Mehl", "menge": 500, "einheit": "g"}, {"name": "Eier", "menge": 3, "einheit": "Stück"}]
Wenn keine Zutaten gefunden werden, gib ein leeres Array [] zurück.
Wichtig: Gib NUR das JSON-Array zurück, kein anderer Text.`
          },
          {
            role: 'user',
            content: `Extrahiere die Zutaten aus diesem Rezept:\n\nURL: ${url}\n\n${textContent}`
          }
        ],
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI error:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'KI-Extraktion fehlgeschlagen' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '[]';
    
    // Parse the JSON from AI response
    let ingredients;
    try {
      // Remove potential markdown code blocks
      const cleaned = content.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
      ingredients = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse AI response:', content);
      return new Response(
        JSON.stringify({ success: false, error: 'Zutaten konnten nicht erkannt werden' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Extracted ${ingredients.length} ingredients`);

    return new Response(
      JSON.stringify({ success: true, ingredients }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unbekannter Fehler' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
