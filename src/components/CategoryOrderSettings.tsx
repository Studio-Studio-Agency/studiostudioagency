import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KATEGORIEN } from "@/components/ListItemRow";
import { MAIN_CATEGORIES, getCustomCategoryOrder, saveCustomCategoryOrder, resetCategoryOrder } from "@/lib/categoryOrder";
import { GripVertical, RotateCcw, ListOrdered } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CategoryOrderSettings = () => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<string[]>(MAIN_CATEGORIES);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  useEffect(() => {
    const custom = getCustomCategoryOrder();
    if (custom) setCategories(custom);
  }, []);

  const moveCategory = (from: number, to: number) => {
    if (to < 0 || to >= categories.length) return;
    const next = [...categories];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setCategories(next);
    saveCustomCategoryOrder(next);
  };

  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    moveCategory(dragIdx, idx);
    setDragIdx(idx);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
  };

  const handleReset = () => {
    resetCategoryOrder();
    setCategories([...MAIN_CATEGORIES]);
    toast({ title: "Zurückgesetzt", description: "Standard-Reihenfolge wiederhergestellt." });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ListOrdered className="h-4 w-4" /> Kategorie-Reihenfolge
        </CardTitle>
        <CardDescription>
          Ziehe die Kategorien in deine bevorzugte Supermarkt-Reihenfolge.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="space-y-1">
          {categories.map((cat, idx) => (
            <div
              key={cat}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-grab active:cursor-grabbing transition-colors ${
                dragIdx === idx
                  ? "bg-accent border-accent"
                  : "bg-background border-border hover:bg-muted"
              }`}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-base">{KATEGORIEN[cat] || "📦"}</span>
              <span className="text-sm flex-1">{cat}</span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => moveCategory(idx, idx - 1)}
                  disabled={idx === 0}
                >
                  <span className="text-xs">↑</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => moveCategory(idx, idx + 1)}
                  disabled={idx === categories.length - 1}
                >
                  <span className="text-xs">↓</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={handleReset} className="w-full mt-2 gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" /> Standard wiederherstellen
        </Button>
      </CardContent>
    </Card>
  );
};

export default CategoryOrderSettings;
