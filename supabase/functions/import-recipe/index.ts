import { requireUser } from "../_shared/require-user.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await requireUser(req, corsHeaders);
    if ("response" in auth) return auth.response;

    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- Scrape with Firecrawl ---
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Scraping recipe with Firecrawl:', formattedUrl);

    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['markdown'],
        onlyMainContent: true,
      }),
    });

    const scrapeData = await scrapeResponse.json();

    if (!scrapeResponse.ok) {
      console.error('Firecrawl error:', scrapeData);
      return new Response(
        JSON.stringify({ success: false, error: `Seite konnte nicht geladen werden (${scrapeResponse.status})` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const markdown = scrapeData.data?.markdown || scrapeData.markdown || '';
    if (!markdown) {
      return new Response(
        JSON.stringify({ success: false, error: 'Kein Inhalt auf der Seite gefunden' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const textContent = markdown.slice(0, 8000);

    // --- Extract ingredients with AI ---
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
            content: `Extrahiere die Zutaten aus diesem Rezept:\n\nURL: ${formattedUrl}\n\n${textContent}`
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

    let ingredients;
    try {
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
