import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ChefHat, Leaf, Lightbulb, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Suggestion {
  title: string;
  description: string;
  emoji: string;
  ingredients?: string[];
}

type Mode = "recipes" | "seasonal" | "tips";

const InspirationPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("recipes");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<{ name: string }[]>([]);
  const [itemsLoaded, setItemsLoaded] = useState(false);

  // Load user's checked items (bought groceries)
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

  // Auto-load on first render
  useEffect(() => {
    if (itemsLoaded) fetchSuggestions(mode);
  }, [itemsLoaded]);

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

        {/* Mode tabs */}
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

        {/* Content */}
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
            {suggestions.map((s, idx) => (
              <Card key={idx} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-xl">{s.emoji}</span>
                    {s.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">{s.description}</p>
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <div className="mt-auto">
        <AppFooter />
      </div>
    </div>
  );
};

export default InspirationPage;
