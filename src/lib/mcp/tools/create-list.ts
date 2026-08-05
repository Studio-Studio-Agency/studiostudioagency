import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { fail, notAuthenticated, ok } from "./_helpers";

export default defineTool({
  name: "create_shopping_list",
  title: "Einkaufsliste erstellen",
  description: "Erstellt eine neue Einkaufsliste für die angemeldete Person.",
  inputSchema: { name: z.string().trim().min(1).describe("Name der Liste, z. B. 'Wocheneinkauf'.") },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ name }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("lists")
      .insert({ name, user_id: ctx.getUserId() })
      .select("id, name")
      .single();
    if (error) return fail(error.message);
    return ok(`Liste "${data.name}" erstellt (${data.id}).`, { list: data });
  },
});
