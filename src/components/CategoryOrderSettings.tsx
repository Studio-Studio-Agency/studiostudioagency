import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KATEGORIEN } from "@/components/ListItemRow";
import { useCategoryOrder } from "@/lib/categoryOrder";
import { GripVertical, RotateCcw, ListOrdered, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CategoryOrderSettings = () => {
  const { toast } = useToast();
  const { categories, loading, saveOrder, resetOrder } = useCategoryOrder();
  const dragIdx: { current: number | null } = { current: null };

  const moveCategory = (from: number, to: number) => {
    if (to < 0 || to >= categories.length) return;
    const next = [...categories];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    saveOrder(next);
  };

  const handleDragStart = (idx: number) => {
    dragIdx.current = idx;
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === idx) return;
    moveCategory(dragIdx.current, idx);
    dragIdx.current = idx;
  };

  const handleDragEnd = () => {
    dragIdx.current = null;
  };

  const handleReset = () => {
    resetOrder();
    toast({ title: "Zurückgesetzt", description: "Standard-Reihenfolge wiederhergestellt." });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ListOrdered className="h-4 w-4" /> Kategorie-Reihenfolge
        </CardTitle>
        <CardDescription>
          Ziehe die Kategorien in deine bevorzugte Supermarkt-Reihenfolge. Wird über alle Geräte synchronisiert.
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
              className="flex items-center gap-2 px-3 py-2 rounded-md border cursor-grab active:cursor-grabbing transition-colors bg-background border-border hover:bg-muted"
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
