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

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Nur POST-Anfragen erlaubt" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { token, items, list_name } = body;

    // Validate token
    if (!token || typeof token !== "string") {
      return new Response(
        JSON.stringify({ error: "Token fehlt oder ungültig" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate items
    const itemList: { name: string; menge?: number; einheit?: string }[] = [];
    if (typeof items === "string") {
      // Simple string: "Milch, Brot, Eier"
      items.split(",").map((s: string) => s.trim()).filter(Boolean).forEach((name: string) => {
        itemList.push({ name });
      });
    } else if (Array.isArray(items)) {
      for (const item of items) {
        if (typeof item === "string") {
          itemList.push({ name: item.trim() });
        } else if (item?.name) {
          itemList.push({
            name: String(item.name).trim(),
            menge: item.menge ? Number(item.menge) : undefined,
            einheit: item.einheit ? String(item.einheit) : undefined,
          });
        }
      }
    } else if (typeof items === "undefined" && body.item) {
      // Single item shorthand: { token, item: "Milch" }
      itemList.push({ name: String(body.item).trim() });
    }

    if (itemList.length === 0 || itemList.some((i) => !i.name)) {
      return new Response(
        JSON.stringify({
          error: "Keine gültigen Artikel angegeben",
          hint: 'Sende z.B. {"token":"...", "items":"Milch, Brot"} oder {"token":"...", "item":"Milch"}',
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit items per request
    if (itemList.length > 50) {
      return new Response(
        JSON.stringify({ error: "Maximal 50 Artikel pro Anfrage" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up user by webhook_token
    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("user_id")
      .eq("webhook_token", token)
      .maybeSingle();

    if (settingsError || !settings) {
      return new Response(
        JSON.stringify({ error: "Ungültiger Token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = settings.user_id;

    // Find or create list
    let listId: string;
    const targetListName = list_name?.trim() || "Einkaufsliste";

    // Try to find existing list with that name
    const { data: existingList } = await supabase
      .from("lists")
      .select("id")
      .eq("user_id", userId)
      .eq("name", targetListName)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingList) {
      listId = existingList.id;
    } else {
      const { data: newList, error: listError } = await supabase
        .from("lists")
        .insert({ name: targetListName, user_id: userId })
        .select("id")
        .single();

      if (listError || !newList) {
        return new Response(
          JSON.stringify({ error: "Liste konnte nicht erstellt werden" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      listId = newList.id;
    }

    // Insert items
    const dbItems = itemList.map((item) => ({
      list_id: listId,
      user_id: userId,
      name: item.name,
      menge: item.menge ?? null,
      einheit: item.einheit ?? null,
      is_checked: false,
    }));

    const { error: insertError } = await supabase.from("items").insert(dbItems);

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Artikel konnten nicht hinzugefügt werden" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update list timestamp
    await supabase
      .from("lists")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", listId);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${itemList.length} Artikel zu "${targetListName}" hinzugefügt`,
        list_id: listId,
        items_added: itemList.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("webhook-add-item error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
