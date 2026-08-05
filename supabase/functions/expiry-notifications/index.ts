import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireServiceRole } from "../_shared/require-user.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const denied = requireServiceRole(req, corsHeaders);
    if (denied) return denied;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get all users with email notifications enabled
    const { data: settings, error: settingsErr } = await supabase
      .from("user_settings")
      .select("user_id, email_notifications")
      .eq("email_notifications", true);

    if (settingsErr) throw settingsErr;
    if (!settings || settings.length === 0) {
      return new Response(JSON.stringify({ message: "No users with notifications enabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let emailsSent = 0;

    for (const setting of settings) {
      // Get checked items with expiry dates within 5 days or already expired
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() + 5);

      const { data: items, error: itemsErr } = await supabase
        .from("items")
        .select("name, ablauf_datum")
        .eq("user_id", setting.user_id)
        .eq("is_checked", true)
        .not("ablauf_datum", "is", null)
        .lte("ablauf_datum", cutoffDate.toISOString().split("T")[0]);

      if (itemsErr || !items || items.length === 0) continue;

      // Get user profile for name
      const { data: profile } = await supabase
        .from("profiles")
        .select("vorname")
        .eq("user_id", setting.user_id)
        .maybeSingle();

      // Get user email
      const { data: { user } } = await supabase.auth.admin.getUserById(setting.user_id);
      if (!user?.email) continue;

      const today = new Date();
      const itemsWithDays = items.map(item => {
        const tage = Math.ceil(
          (new Date(item.ablauf_datum!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          name: item.name,
          ablauf_datum: new Date(item.ablauf_datum!).toLocaleDateString("de-CH"),
          tage,
        };
      }).sort((a, b) => a.tage - b.tage);

      // Send transactional email
      const { error: sendErr } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "expiry-reminder",
          recipientEmail: user.email,
          idempotencyKey: `expiry-${setting.user_id}-${today.toISOString().split("T")[0]}`,
          templateData: {
            vorname: profile?.vorname || undefined,
            items: itemsWithDays,
          },
        },
      });

      if (sendErr) {
        console.error(`Failed to send expiry email for user ${setting.user_id}:`, sendErr);
        continue;
      }
      emailsSent++;
    }

    return new Response(JSON.stringify({ success: true, emailsSent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Expiry notifications error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
