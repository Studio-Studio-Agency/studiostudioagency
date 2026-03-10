import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { UtensilsCrossed, Loader2, Link as LinkIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Ingredient {
  name: string;
  menge: number | null;
  einheit: string | null;
}

interface RecipeImportDialogProps {
  listId: string;
  userId: string;
  onItemsAdded: () => void;
}

const RecipeImportDialog = ({ listId, userId, onItemsAdded }: RecipeImportDialogProps) => {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();

  const handleExtract = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setIngredients([]);

    try {
      const { data, error } = await supabase.functions.invoke("import-recipe", {
        body: { url: url.trim() },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Fehler beim Importieren");

      const items = data.ingredients as Ingredient[];
      setIngredients(items);
      setSelected(new Set(items.map((_, i) => i)));

      if (items.length === 0) {
        toast({ title: "Keine Zutaten gefunden", description: "Versuche eine andere URL.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message || "Import fehlgeschlagen", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (index: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleAdd = async () => {
    const toAdd = ingredients.filter((_, i) => selected.has(i));
    if (toAdd.length === 0) return;
    setAdding(true);

    try {
      const inserts = toAdd.map(ing => ({
        list_id: listId,
        user_id: userId,
        name: ing.menge && ing.einheit
          ? `${ing.menge} ${ing.einheit} ${ing.name}`
          : ing.name,
      }));

      const { error } = await supabase.from("items").insert(inserts);
      if (error) throw error;

      toast({ title: `${toAdd.length} Zutaten hinzugefügt ✓` });
      setOpen(false);
      setUrl("");
      setIngredients([]);
      setSelected(new Set());
      onItemsAdded();
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <UtensilsCrossed className="h-4 w-4" />
          Rezept importieren
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5" />
            Rezept-Import
          </DialogTitle>
          <DialogDescription>
            Füge eine Rezept-URL ein und die Zutaten werden automatisch erkannt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="https://chefkoch.de/rezepte/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="pl-9"
                onKeyDown={(e) => e.key === "Enter" && handleExtract()}
              />
            </div>
            <Button onClick={handleExtract} disabled={loading || !url.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Laden"}
            </Button>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Zutaten werden erkannt…
            </div>
          )}

          {ingredients.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {ingredients.length} Zutaten gefunden
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (selected.size === ingredients.length) setSelected(new Set());
                    else setSelected(new Set(ingredients.map((_, i) => i)));
                  }}
                >
                  {selected.size === ingredients.length ? "Keine" : "Alle"} auswählen
                </Button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1 border rounded-md p-2">
                {ingredients.map((ing, i) => (
                  <label
                    key={i}
                    className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-accent/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selected.has(i)}
                      onCheckedChange={() => toggleItem(i)}
                    />
                    <span className="text-sm">
                      {ing.menge && ing.einheit ? (
                        <>
                          <span className="text-muted-foreground">{ing.menge} {ing.einheit}</span>{" "}
                          {ing.name}
                        </>
                      ) : (
                        ing.name
                      )}
                    </span>
                  </label>
                ))}
              </div>

              <Button
                onClick={handleAdd}
                disabled={adding || selected.size === 0}
                className="w-full"
              >
                {adding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  `${selected.size} Zutaten zur Liste hinzufügen`
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RecipeImportDialog;
