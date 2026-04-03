import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, ChefHat, Leaf, Lightbulb, RefreshCw, ShoppingCart, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Suggestion {
  title: string;
  description: string;
  emoji: string;
  ingredients?: string[];
  steps?: string[];
  servings?: string;
  time?: string;
}

type Mode = "recipes" | "seasonal" | "tips";

const InspirationPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("recipes");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<{ name: string }[]>([]);
  const [itemsLoaded, setItemsLoaded] = useState(false);
  const [expandedRecipe, setExpandedRecipe] = useState<number | null>(null);

  // List creation dialog
  const [createListOpen, setCreateListOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [selectedRecipeIdx, setSelectedRecipeIdx] = useState<number | null>(null);
  const [creatingList, setCreatingList] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("items")
      .select("name")
      .eq("user_id", user.id)
      .eq("is_checked", true)
      .then(({ data }) => {
        setItems(data || []);
        setItemsLoaded(true);
      });
  }, [user]);

  const fetchSuggestions = async (m: Mode) => {
    setLoading(true);
    setSuggestions([]);
    setExpandedRecipe(null);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-recipes", {
        body: { items, mode: m },
      });
      if (error) throw error;
      if (data?.success) {
        setSuggestions(data.suggestions);
      } else {
        toast({ title: "Fehler", description: data?.error || "Unbekannter Fehler", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message || "Verbindungsfehler", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleModeChange = (m: Mode) => {
    setMode(m);
    if (itemsLoaded) fetchSuggestions(m);
  };

  useEffect(() => {
    if (itemsLoaded) fetchSuggestions(mode);
  }, [itemsLoaded]);

  const createListFromRecipe = async () => {
    if (!user || selectedRecipeIdx === null || !newListName.trim()) return;
    const recipe = suggestions[selectedRecipeIdx];
    if (!recipe?.ingredients?.length) return;

    setCreatingList(true);
    try {
      const { data: listData, error: listError } = await supabase
        .from("lists")
        .insert({ name: newListName.trim(), user_id: user.id })
        .select()
        .single();

      if (listError) throw listError;

      const itemsToInsert = recipe.ingredients.map((ing) => ({
        list_id: listData.id,
        user_id: user.id,
        name: ing,
      }));

      const { error: itemsError } = await supabase.from("items").insert(itemsToInsert);
      if (itemsError) throw itemsError;

      toast({ title: "Liste erstellt ✅", description: `${recipe.ingredients.length} Zutaten hinzugefügt.` });
      setCreateListOpen(false);
      setNewListName("");
      navigate(`/listen/${listData.id}`);
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
    setCreatingList(false);
  };

  const openCreateList = (idx: number) => {
    const recipe = suggestions[idx];
    setSelectedRecipeIdx(idx);
    setNewListName(recipe.title);
    setCreateListOpen(true);
  };

  const tabs: { key: Mode; label: string; icon: React.ReactNode }[] = [
    { key: "recipes", label: "Rezepte", icon: <ChefHat className="h-4 w-4" /> },
    { key: "seasonal", label: "Saisonal", icon: <Leaf className="h-4 w-4" /> },
    { key: "tips", label: "Tipps", icon: <Lightbulb className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <main className="container py-6 max-w-2xl flex-1">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Inspiration</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchSuggestions(mode)}
            disabled={loading}
            aria-label="Neu laden"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="flex gap-1 mb-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => handleModeChange(t.key)}
              className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border transition-colors ${
                mode === t.key
                  ? "bg-primary text-primary-foreground border-primary font-medium"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">KI denkt nach…</p>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">
              {items.length === 0 && mode !== "seasonal"
                ? "Hake Artikel in deinen Listen ab, um Rezeptvorschläge zu erhalten."
                : "Keine Vorschläge verfügbar."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {suggestions.map((s, idx) => {
              const isExpanded = expandedRecipe === idx;
              return (
                <Card key={idx} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="text-xl">{s.emoji}</span>
                      <span className="flex-1">{s.title}</span>
                      {mode === "recipes" && s.ingredients && s.ingredients.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 gap-1 text-xs"
                          onClick={() => openCreateList(idx)}
                        >
                          <ShoppingCart className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Einkaufsliste</span>
                        </Button>
                      )}
                      {mode === "seasonal" && s.ingredients && s.ingredients.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 gap-1 text-xs"
                          onClick={() => openCreateList(idx)}
                        >
                          <ShoppingCart className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">{s.description}</p>

                    {/* Meta info */}
                    {(s.servings || s.time) && (
                      <div className="flex gap-3 text-xs text-muted-foreground mb-2">
                        {s.servings && <span>🍽️ {s.servings}</span>}
                        {s.time && <span>⏱️ {s.time}</span>}
                      </div>
                    )}

                    {/* Ingredients */}
                    {s.ingredients && s.ingredients.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {s.ingredients.map((ing, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
                          >
                            {ing}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Recipe steps toggle */}
                    {mode === "recipes" && s.steps && s.steps.length > 0 && (
                      <div className="mt-3">
                        <button
                          onClick={() => setExpandedRecipe(isExpanded ? null : idx)}
                          className="flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          {isExpanded ? "Rezept zuklappen" : "Rezept anzeigen"}
                        </button>

                        {isExpanded && (
                          <ol className="mt-3 space-y-2 list-decimal list-inside">
                            {s.steps.map((step, i) => (
                              <li key={i} className="text-sm text-foreground leading-relaxed">
                                {step}
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <div className="mt-auto">
        <AppFooter />
      </div>

      {/* Create list from recipe dialog */}
      <Dialog open={createListOpen} onOpenChange={setCreateListOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Einkaufsliste aus Rezept erstellen</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); createListFromRecipe(); }}
            className="space-y-4"
          >
            <Input
              placeholder="Name der Liste"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              autoFocus
            />
            {selectedRecipeIdx !== null && suggestions[selectedRecipeIdx]?.ingredients && (
              <div className="text-sm text-muted-foreground">
                {suggestions[selectedRecipeIdx].ingredients!.length} Zutaten werden hinzugefügt
              </div>
            )}
            <Button type="submit" className="w-full" disabled={!newListName.trim() || creatingList}>
              {creatingList ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Liste erstellen
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InspirationPage;
