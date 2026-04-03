import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all users with auto_delete_days set
    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("user_id, auto_delete_days")
      .not("auto_delete_days", "is", null);

    if (settingsError) throw settingsError;
    if (!settings || settings.length === 0) {
      return new Response(JSON.stringify({ message: "No users with auto-delete configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalDeleted = 0;

    for (const setting of settings) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - setting.auto_delete_days);

      const { data: deleted, error: deleteError } = await supabase
        .from("items")
        .delete()
        .eq("user_id", setting.user_id)
        .eq("is_checked", true)
        .lt("checked_at", cutoffDate.toISOString())
        .select("id");

      if (deleteError) {
        console.error(`Error deleting for user ${setting.user_id}:`, deleteError);
        continue;
      }
      totalDeleted += deleted?.length || 0;
    }

    return new Response(JSON.stringify({ success: true, deleted: totalDeleted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Auto-delete error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
