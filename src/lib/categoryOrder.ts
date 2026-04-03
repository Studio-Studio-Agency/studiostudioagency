import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const DEFAULT_CATEGORY_ORDER = [
  "Obst & Früchte", "Obst", "Früchte",
  "Gemüse & Salat", "Gemüse", "Salat",
  "Backwaren",
  "Milchprodukte",
  "Fleisch & Fisch", "Fleisch", "Fisch",
  "Tiefkühl",
  "Frühstück & Cerealien", "Frühstück",
  "Konserven & Vorrat", "Konserven",
  "Gewürze & Saucen", "Gewürze", "Saucen",
  "Snacks & Süsses", "Snacks", "Süsses",
  "Getränke",
  "Haushalt & Reinigung", "Haushalt", "Reinigung",
  "Pflege & Hygiene", "Pflege", "Hygiene",
  "Baby & Kind",
  "Tierbedarf",
  "Technik & Elektronik", "Technik", "Elektronik",
  "Sonstiges",
];

export const MAIN_CATEGORIES = [
  "Obst & Früchte",
  "Gemüse & Salat",
  "Backwaren",
  "Milchprodukte",
  "Fleisch & Fisch",
  "Tiefkühl",
  "Frühstück & Cerealien",
  "Konserven & Vorrat",
  "Gewürze & Saucen",
  "Snacks & Süsses",
  "Getränke",
  "Haushalt & Reinigung",
  "Pflege & Hygiene",
  "Baby & Kind",
  "Tierbedarf",
  "Technik & Elektronik",
  "Sonstiges",
];

// In-memory cache for the current session
let cachedOrder: string[] | null = null;

export function getCachedCategoryOrder(): string[] {
  return cachedOrder || MAIN_CATEGORIES;
}

export function setCachedCategoryOrder(order: string[]) {
  cachedOrder = order;
}

export function getCategorySortIndex(cat: string): number {
  const order = getCachedCategoryOrder();

  const idx = order.indexOf(cat);
  if (idx !== -1) return idx;

  const defIdx = DEFAULT_CATEGORY_ORDER.indexOf(cat);
  if (defIdx !== -1) {
    for (let i = defIdx - 1; i >= 0; i--) {
      const parent = DEFAULT_CATEGORY_ORDER[i];
      if (MAIN_CATEGORIES.includes(parent)) {
        const parentIdx = order.indexOf(parent);
        if (parentIdx !== -1) return parentIdx;
        break;
      }
    }
  }

  return 998;
}

/**
 * Hook to load and save category order from database.
 */
export function useCategoryOrder() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<string[]>(getCachedCategoryOrder());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase
      .from("user_settings")
      .select("category_order")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.category_order && Array.isArray(data.category_order)) {
          const order = data.category_order as string[];
          setCategories(order);
          setCachedCategoryOrder(order);
        }
        setLoading(false);
      });
  }, [user]);

  const saveOrder = useCallback(async (order: string[]) => {
    setCategories(order);
    setCachedCategoryOrder(order);
    if (!user) return;
    await supabase
      .from("user_settings")
      .upsert({
        user_id: user.id,
        category_order: order as any,
      }, { onConflict: "user_id" });
  }, [user]);

  const resetOrder = useCallback(async () => {
    const defaultOrder = [...MAIN_CATEGORIES];
    setCategories(defaultOrder);
    setCachedCategoryOrder(defaultOrder);
    if (!user) return;
    await supabase
      .from("user_settings")
      .upsert({
        user_id: user.id,
        category_order: null as any,
      }, { onConflict: "user_id" });
  }, [user]);

  return { categories, loading, saveOrder, resetOrder };
}
