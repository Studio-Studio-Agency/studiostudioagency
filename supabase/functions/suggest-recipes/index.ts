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
      systemPrompt = `Du bist ein Schweizer Ernährungsexperte. Es ist ${month} (${season}).
Gib 5-6 saisonale Schweizer Produkte, die JETZT in der Schweiz Saison haben.
Konzentriere dich auf Schweizer Spezialitäten, regionales Obst, Gemüse und Produkte.
Gib für jedes Produkt konkrete Rezeptideen oder Verwendungstipps.

Antworte auf Deutsch als JSON-Array mit Objekten:
{
  "title": "Produktname",
  "description": "Warum es jetzt Saison hat, woher es kommt, und wie man es am besten verwendet (2-3 Sätze)",
  "emoji": "passendes Emoji",
  "ingredients": ["Rezeptidee 1 mit diesem Produkt", "Rezeptidee 2"],
  "servings": "Saison: März–Mai" (oder passender Zeitraum),
  "time": "Region: Bern, Wallis etc." (oder passende Region)
}
NUR das JSON-Array, kein anderer Text.`;
    } else if (mode === 'tips') {
      systemPrompt = `Du bist ein Experte für Lebensmittel und Nachhaltigkeit. Gib 3-4 praktische Tipps zur Lagerung und Haltbarkeit für diese Lebensmittel: ${itemList}. Antworte auf Deutsch als JSON-Array mit Objekten: {"title": "...", "description": "...", "emoji": "..."}. NUR das JSON-Array, kein anderer Text.`;
    } else {
      systemPrompt = `Du bist ein kreativer Koch. Schlage 3-4 Rezepte vor, die man mit diesen Zutaten (oder Teilen davon) kochen kann: ${itemList}. 

Antworte auf Deutsch als JSON-Array mit Objekten:
{
  "title": "Rezeptname",
  "description": "Kurze Beschreibung (1-2 Sätze)",
  "ingredients": ["Zutat1 (Menge)", "Zutat2 (Menge)"],
  "steps": ["Schritt 1: ...", "Schritt 2: ...", "Schritt 3: ..."],
  "servings": "4 Portionen",
  "time": "30 Min.",
  "emoji": "passendes Emoji"
}

Gib vollständige Rezepte mit konkreten Mengenangaben bei den Zutaten und detaillierten Zubereitungsschritten.
NUR das JSON-Array, kein anderer Text.`;
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
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
