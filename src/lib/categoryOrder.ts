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

// Main categories only (no aliases) for the settings UI
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

const STORAGE_KEY = "goodgoods_category_order";

export function getCustomCategoryOrder(): string[] | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

export function saveCustomCategoryOrder(order: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
}

export function resetCategoryOrder(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Returns an ordering function based on custom or default order.
 * Aliases map to their parent category's position.
 */
export function getCategorySortIndex(cat: string): number {
  const custom = getCustomCategoryOrder();
  const order = custom || MAIN_CATEGORIES;

  // Direct match
  const idx = order.indexOf(cat);
  if (idx !== -1) return idx;

  // Check default order for aliases
  const defIdx = DEFAULT_CATEGORY_ORDER.indexOf(cat);
  if (defIdx !== -1) {
    // Find the main category this alias belongs to by looking backwards
    for (let i = defIdx - 1; i >= 0; i--) {
      const parent = DEFAULT_CATEGORY_ORDER[i];
      if (MAIN_CATEGORIES.includes(parent)) {
        const parentIdx = order.indexOf(parent);
        if (parentIdx !== -1) return parentIdx;
        break;
      }
    }
  }

  return 998; // Unknown categories go near the end
}
