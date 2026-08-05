import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { fail, notAuthenticated, ok } from "./_helpers";

export default defineTool({
  name: "check_item",
  title: "Artikel abhaken",
  description: "Hakt einen Artikel ab (wandert damit in den Vorrat) oder macht das Abhaken rückgängig.",
  inputSchema: {
    item_id: z.string().uuid().describe("ID des Artikels."),
    checked: z.boolean().default(true).describe("true = abhaken, false = zurück auf die Liste."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ item_id, checked }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("items")
      .update({ is_checked: checked, checked_at: checked ? new Date().toISOString() : null })
      .eq("id", item_id)
      .select("id, name, is_checked, ablauf_datum")
      .single();
    if (error) return fail(error.message);
    return ok(`${data.name} ist jetzt ${data.is_checked ? "abgehakt" : "wieder offen"}.`, { item: data });
  },
});
