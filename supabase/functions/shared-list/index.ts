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
    const { action, token, payload } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: "Token fehlt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to bypass RLS — token is the authorization
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate token and get list
    const { data: list, error: listError } = await supabase
      .from("lists")
      .select("id, name, user_id, edit_token")
      .eq("edit_token", token)
      .single();

    if (listError || !list) {
      return new Response(JSON.stringify({ error: "Ungültiger Link" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_list") {
      const { data: items } = await supabase
        .from("items")
        .select("*")
        .eq("list_id", list.id)
        .order("created_at", { ascending: true });

      return new Response(
        JSON.stringify({ list: { id: list.id, name: list.name }, items: items || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "add_item") {
      const { name } = payload;
      if (!name?.trim()) {
        return new Response(JSON.stringify({ error: "Name fehlt" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase
        .from("items")
        .insert({
          list_id: list.id,
          user_id: list.user_id, // attribute to list owner
          name: name.trim(),
        })
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ item: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "toggle_item") {
      const { itemId, isChecked } = payload;
      const { error } = await supabase
        .from("items")
        .update({
          is_checked: isChecked,
          checked_at: isChecked ? new Date().toISOString() : null,
        })
        .eq("id", itemId)
        .eq("list_id", list.id);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_item") {
      const { itemId } = payload;
      const { error } = await supabase
        .from("items")
        .delete()
        .eq("id", itemId)
        .eq("list_id", list.id);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unbekannte Aktion" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("shared-list error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
