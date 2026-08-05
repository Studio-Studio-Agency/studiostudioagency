import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { fail, notAuthenticated, ok } from "./_helpers";

export default defineTool({
  name: "list_items",
  title: "Artikel einer Liste",
  description: "Zeigt die Artikel einer Einkaufsliste, optional nur offene oder nur abgehakte.",
  inputSchema: {
    list_id: z.string().uuid().describe("ID der Einkaufsliste (aus list_shopping_lists)."),
    status: z.enum(["alle", "offen", "abgehakt"]).default("offen").describe("Filter nach Status."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ list_id, status }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("items")
      .select("id, name, menge, einheit, kategorie, is_checked, ablauf_datum, preis")
      .eq("list_id", list_id)
      .order("created_at", { ascending: true });
    if (status === "offen") query = query.eq("is_checked", false);
    if (status === "abgehakt") query = query.eq("is_checked", true);
    const { data, error } = await query;
    if (error) return fail(error.message);
    return ok(JSON.stringify(data ?? [], null, 2), { items: data ?? [] });
  },
});
