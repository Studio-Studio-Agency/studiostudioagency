import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { fail, notAuthenticated, ok } from "./_helpers";

export default defineTool({
  name: "add_item",
  title: "Artikel hinzufügen",
  description: "Fügt einer Einkaufsliste einen neuen Artikel hinzu.",
  inputSchema: {
    list_id: z.string().uuid().describe("ID der Einkaufsliste."),
    name: z.string().trim().min(1).describe("Name des Artikels, z. B. 'Milch'."),
    menge: z.number().positive().optional().describe("Menge, z. B. 2."),
    einheit: z.string().trim().optional().describe("Einheit, z. B. 'Stück', 'g', 'l'."),
    kategorie: z.string().trim().optional().describe("Kategorie, z. B. 'Milchprodukte'."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ list_id, name, menge, einheit, kategorie }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("items")
      .insert({ list_id, user_id: ctx.getUserId(), name, menge: menge ?? null, einheit: einheit ?? null, kategorie: kategorie ?? null })
      .select("id, name, menge, einheit, kategorie")
      .single();
    if (error) return fail(error.message);
    return ok(`Hinzugefügt: ${data.name}`, { item: data });
  },
});
