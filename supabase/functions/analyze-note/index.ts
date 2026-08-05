import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireUser } from "../_shared/require-user.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await requireUser(req, corsHeaders);
    if ("response" in auth) return auth.response;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { content, mode } = await req.json();
    // mode: "todos" | "summarize" | "shopping" | "all"

    if (!content?.trim()) {
      return new Response(JSON.stringify({ error: "Kein Inhalt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompts: Record<string, string> = {
      todos: `Du bist ein Produktivitäts-Assistent. Analysiere die Notiz und extrahiere konkrete Aufgaben/To-Dos. Gib für jede Aufgabe einen kurzen Titel und optional eine Priorität (hoch/mittel/niedrig) an. Antworte auf Deutsch im JSON-Format.`,
      summarize: `Du bist ein Organisations-Assistent. Fasse die Notiz zusammen und ordne die Punkte nach Dringlichkeit. Antworte auf Deutsch im JSON-Format.`,
      shopping: `Du bist ein Einkaufs-Assistent. Erkenne Lebensmittel, Produkte oder Zutaten in der Notiz und erstelle eine Einkaufsliste mit Mengen. Antworte auf Deutsch im JSON-Format.`,
      all: `Du bist ein intelligenter Notiz-Assistent. Analysiere die folgende Notiz und liefere DREI Abschnitte:
1. "todos": Erkannte Aufgaben mit Titel und Priorität (hoch/mittel/niedrig)
2. "summary": Zusammenfassung und nach Dringlichkeit sortierte Punkte
3. "shopping": Erkannte Produkte/Lebensmittel als Einkaufsliste mit Mengen

Antworte auf Deutsch im JSON-Format.`,
    };

    const tools = [
      {
        type: "function",
        function: {
          name: "analyze_note",
          description: "Return structured analysis of a note",
          parameters: {
            type: "object",
            properties: {
              todos: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    priority: { type: "string", enum: ["hoch", "mittel", "niedrig"] },
                  },
                  required: ["title", "priority"],
                },
              },
              summary: {
                type: "object",
                properties: {
                  text: { type: "string" },
                  priorities: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        point: { type: "string" },
                        urgency: { type: "string", enum: ["dringend", "wichtig", "kann warten"] },
                      },
                      required: ["point", "urgency"],
                    },
                  },
                },
                required: ["text", "priorities"],
              },
              shopping: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    menge: { type: "string" },
                  },
                  required: ["name"],
                },
              },
            },
            required: ["todos", "summary", "shopping"],
          },
        },
      },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompts[mode] || systemPrompts.all },
          { role: "user", content },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "analyze_note" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Zu viele Anfragen, bitte warte kurz." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "KI-Kontingent aufgebraucht." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-note error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
