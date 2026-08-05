import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";
import { fail, notAuthenticated, ok } from "./_helpers";

export default defineTool({
  name: "list_shopping_lists",
  title: "Einkaufslisten auflisten",
  description: "Listet alle Einkaufslisten der angemeldeten Person mit Anzahl offener Artikel auf.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("lists")
      .select("id, name, updated_at, items(id, is_checked)")
      .order("updated_at", { ascending: false });
    if (error) return fail(error.message);
    const lists = (data ?? []).map((l: any) => ({
      id: l.id,
      name: l.name,
      updated_at: l.updated_at,
      open_items: (l.items ?? []).filter((i: any) => !i.is_checked).length,
      total_items: (l.items ?? []).length,
    }));
    return ok(JSON.stringify(lists, null, 2), { lists });
  },
});
