import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.98.0/cors";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get all users with email notifications enabled
    const { data: settings } = await supabase
      .from("user_settings")
      .select("user_id, email_notifications, monthly_budget, category_budgets");

    if (!settings || settings.length === 0) {
      return new Response(JSON.stringify({ message: "No users" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const monthLabel = monthStart.toLocaleDateString("de-CH", { month: "long", year: "numeric" });

    let sent = 0;

    for (const setting of settings) {
      if (!setting.email_notifications) continue;

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("vorname")
        .eq("user_id", setting.user_id)
        .maybeSingle();

      // Get user email from auth
      const { data: { user: authUser } } = await supabase.auth.admin.getUserById(setting.user_id);
      if (!authUser?.email) continue;

      // Check suppression
      const { data: suppressed } = await supabase
        .from("suppressed_emails")
        .select("id")
        .eq("email", authUser.email)
        .maybeSingle();
      if (suppressed) continue;

      // Get items for this month
      const { data: items } = await supabase
        .from("items")
        .select("name, kategorie, preis, is_checked, checked_at")
        .eq("user_id", setting.user_id)
        .eq("is_checked", true)
        .gte("checked_at", monthStart.toISOString())
        .lte("checked_at", monthEnd.toISOString());

      if (!items || items.length === 0) continue;

      const totalItems = items.length;
      const totalSpent = items.reduce((s, i) => s + (i.preis || 0), 0);

      // Category stats
      const catMap: Record<string, { count: number; spent: number }> = {};
      items.forEach(i => {
        const cat = i.kategorie || "Sonstiges";
        if (!catMap[cat]) catMap[cat] = { count: 0, spent: 0 };
        catMap[cat].count++;
        catMap[cat].spent += i.preis || 0;
      });
      const topCategories = Object.entries(catMap)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.count - a.count);

      // Create unsubscribe token
      const token = crypto.randomUUID();
      await supabase.from("email_unsubscribe_tokens").insert({
        email: authUser.email,
        token,
      });

      const unsubscribeUrl = `${supabaseUrl.replace('.supabase.co', '.supabase.co').replace('/rest/v1', '')}/functions/v1/handle-email-unsubscribe?token=${token}`;

      // Enqueue email
      await supabase.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          templateName: "monthly-summary",
          to: authUser.email,
          data: {
            vorname: profile?.vorname || "",
            monthLabel,
            totalItems,
            totalSpent,
            topCategories,
            monthlyBudget: setting.monthly_budget,
            unsubscribeUrl: `${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`,
          },
        },
      });
      sent++;
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
