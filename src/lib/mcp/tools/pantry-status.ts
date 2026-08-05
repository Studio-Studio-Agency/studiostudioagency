import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { fail, notAuthenticated, ok } from "./_helpers";

export default defineTool({
  name: "pantry_status",
  title: "Vorrat & Ablaufdaten",
  description: "Zeigt den aktuellen Vorrat (abgehakte Artikel) sortiert nach Ablaufdatum – ideal für 'Was läuft bald ab?'.",
  inputSchema: {
    tage: z.number().int().min(1).max(90).default(7).describe("Nur Artikel, die in den nächsten X Tagen ablaufen."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ tage }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const limit = new Date(Date.now() + tage * 86_400_000).toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("items")
      .select("id, name, kategorie, ablauf_datum, lagerhinweis")
      .eq("is_checked", true)
      .not("ablauf_datum", "is", null)
      .lte("ablauf_datum", limit)
      .order("ablauf_datum", { ascending: true });
    if (error) return fail(error.message);
    const today = new Date().toISOString().slice(0, 10);
    const items = (data ?? []).map((i: any) => ({
      ...i,
      status: i.ablauf_datum < today ? "abgelaufen" : "läuft bald ab",
    }));
    return ok(JSON.stringify(items, null, 2), { items });
  },
});
