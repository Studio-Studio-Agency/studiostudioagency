import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listShoppingListsTool from "./tools/list-lists";
import listItemsTool from "./tools/list-items";
import addItemTool from "./tools/add-item";
import checkItemTool from "./tools/check-item";
import pantryStatusTool from "./tools/pantry-status";
import createListTool from "./tools/create-list";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "goodgoods-ai-deine-ki-gest-tzte-einkaufsliste",
  title: "GoodGoods AI - Deine KI-gestützte Einkaufsliste",
  version: "0.1.0",
  instructions:
    "Tools für GoodGoods, eine smarte Einkaufsliste mit Vorratsverwaltung gegen Foodwaste. " +
    "Nutze list_shopping_lists, um Listen zu finden, list_items für deren Artikel, add_item und create_shopping_list zum Anlegen, " +
    "check_item zum Abhaken (abgehakte Artikel wandern in den Vorrat) und pantry_status für Lebensmittel, die bald ablaufen.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listShoppingListsTool, listItemsTool, createListTool, addItemTool, checkItemTool, pantryStatusTool],
});
