const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { items, mode } = await req.json();
    // mode: "recipes" | "seasonal" | "tips"

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const itemList = (items || []).map((i: any) => i.name).join(', ');
    const now = new Date();
    const month = now.toLocaleString('de-DE', { month: 'long' });
    const season = getSeason(now.getMonth());

    let systemPrompt = '';
    if (mode === 'seasonal') {
      systemPrompt = `Du bist ein Ernährungsexperte. Es ist ${month} (${season}). Gib 4-5 saisonale Tipps und Empfehlungen für Lebensmittel, die gerade Saison haben. Antworte auf Deutsch als JSON-Array mit Objekten: {"title": "...", "description": "...", "emoji": "..."}. NUR das JSON-Array, kein anderer Text.`;
    } else if (mode === 'tips') {
      systemPrompt = `Du bist ein Experte für Lebensmittel und Nachhaltigkeit. Gib 3-4 praktische Tipps zur Lagerung und Haltbarkeit für diese Lebensmittel: ${itemList}. Antworte auf Deutsch als JSON-Array mit Objekten: {"title": "...", "description": "...", "emoji": "..."}. NUR das JSON-Array, kein anderer Text.`;
    } else {
      systemPrompt = `Du bist ein kreativer Koch. Schlage 3-4 Rezepte vor, die man mit diesen Zutaten (oder Teilen davon) kochen kann: ${itemList}. Antworte auf Deutsch als JSON-Array mit Objekten: {"title": "Rezeptname", "description": "Kurze Beschreibung (1-2 Sätze)", "ingredients": ["Zutat1", "Zutat2"], "emoji": "passendes Emoji"}. NUR das JSON-Array, kein anderer Text.`;
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: mode === 'seasonal' ? `Gib saisonale Tipps für ${month}.` : mode === 'tips' ? `Tipps für: ${itemList}` : `Rezepte mit: ${itemList}` },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ success: false, error: 'Zu viele Anfragen, bitte versuche es später erneut.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ success: false, error: 'KI-Kontingent aufgebraucht.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await aiResponse.text();
      console.error('AI error:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'KI-Fehler' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '[]';

    let suggestions;
    try {
      const cleaned = content.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
      suggestions = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse AI response:', content);
      return new Response(
        JSON.stringify({ success: false, error: 'Antwort konnte nicht verarbeitet werden' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, suggestions }),
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

function getSeason(month: number): string {
  if (month >= 2 && month <= 4) return 'Frühling';
  if (month >= 5 && month <= 7) return 'Sommer';
  if (month >= 8 && month <= 10) return 'Herbst';
  return 'Winter';
}
