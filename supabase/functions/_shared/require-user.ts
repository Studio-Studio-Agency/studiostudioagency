import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Validates that the request carries a real signed-in user JWT.
 * Returns the user id, or a Response to return immediately.
 */
export async function requireUser(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<{ userId: string } | { response: Response }> {
  const authHeader = req.headers.get("Authorization");
  const unauthorized = () =>
    new Response(JSON.stringify({ success: false, error: "Nicht angemeldet" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (!authHeader?.startsWith("Bearer ")) return { response: unauthorized() };

  const token = authHeader.replace("Bearer ", "").trim();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const { data, error } = await supabase.auth.getClaims(token);
  const sub = data?.claims?.sub as string | undefined;
  if (error || !sub) return { response: unauthorized() };
  return { userId: sub };
}

/**
 * Validates that the request was made with the service role key
 * (used by scheduled cron jobs and other trusted server-side callers).
 */
export function requireServiceRole(
  req: Request,
  corsHeaders: Record<string, string>,
): Response | null {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!token || !serviceKey || token !== serviceKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return null;
}
