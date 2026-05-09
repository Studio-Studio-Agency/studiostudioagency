import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChefHat, Loader2, Package, Trash2, RotateCcw, Search, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getProductIcon } from "@/lib/productIcons";

interface PantryItem {
  id: string;
  name: string;
  menge: number | null;
  einheit: string | null;
  ablauf_datum: string | null;
  haltbarkeit_tage: number | null;
  checked_at: string | null;
  lagerhinweis: string | null;
  list_id: string;
  kategorie: string | null;
}

const daysBetween = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
};

type UrgencyFilter = "all" | "expired" | "urgent" | "week" | "later";

const PantryPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [urgency, setUrgency] = useState<UrgencyFilter>("all");
  const [category, setCategory] = useState<string>("all");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("items")
      .select("id,name,menge,einheit,ablauf_datum,haltbarkeit_tage,checked_at,lagerhinweis,list_id,kategorie")
      .eq("user_id", user.id)
      .eq("is_checked", true)
      .not("ablauf_datum", "is", null)
      .order("ablauf_datum", { ascending: true });
    setItems((data as PantryItem[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => it.kategorie && set.add(it.kategorie));
    return Array.from(set).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (q && !it.name.toLowerCase().includes(q)) return false;
      if (category !== "all" && it.kategorie !== category) return false;
      if (urgency !== "all" && it.ablauf_datum) {
        const d = daysBetween(it.ablauf_datum);
        if (urgency === "expired" && d >= 0) return false;
        if (urgency === "urgent" && (d < 0 || d > 2)) return false;
        if (urgency === "week" && (d < 3 || d > 7)) return false;
        if (urgency === "later" && d < 8) return false;
      }
      return true;
    });
  }, [items, query, category, urgency]);

  const groups = useMemo(() => {
    const expired: PantryItem[] = [];
    const urgent: PantryItem[] = [];
    const week: PantryItem[] = [];
    const later: PantryItem[] = [];
    filteredItems.forEach((it) => {
      if (!it.ablauf_datum) return;
      const d = daysBetween(it.ablauf_datum);
      if (d < 0) expired.push(it);
      else if (d <= 2) urgent.push(it);
      else if (d <= 7) week.push(it);
      else later.push(it);
    });
    return { expired, urgent, week, later };
  }, [filteredItems]);

  const markUsed = async (id: string) => {
    await supabase.from("items").delete().eq("id", id);
    setItems((prev) => prev.filter((p) => p.id !== id));
    toast({ title: "Aufgegessen ✓", description: "Aus dem Vorrat entfernt." });
  };

  const extend = async (item: PantryItem) => {
    if (!item.ablauf_datum) return;
    const newDate = new Date(item.ablauf_datum);
    newDate.setDate(newDate.getDate() + 3);
    const iso = newDate.toISOString().slice(0, 10);
    await supabase.from("items").update({ ablauf_datum: iso }).eq("id", item.id);
    setItems((prev) =>
      [...prev.map((p) => (p.id === item.id ? { ...p, ablauf_datum: iso } : p))].sort(
        (a, b) => (a.ablauf_datum ?? "").localeCompare(b.ablauf_datum ?? ""),
      ),
    );
    toast({ title: "+3 Tage", description: "Sieht ja noch frisch aus." });
  };

  const expiringSoonNames = [...groups.urgent, ...groups.week].map((i) => i.name);
  const cookHref = `/inspiration${
    expiringSoonNames.length ? `?focus=${encodeURIComponent(expiringSoonNames.join(","))}` : ""
  }`;

  const filtersActive = query.trim() !== "" || urgency !== "all" || category !== "all";
  const resetFilters = () => {
    setQuery("");
    setUrgency("all");
    setCategory("all");
  };

  const urgencyTabs: { key: UrgencyFilter; label: string }[] = [
    { key: "all", label: "Alle" },
    { key: "expired", label: "Abgelaufen" },
    { key: "urgent", label: "Bald" },
    { key: "week", label: "Diese Woche" },
    { key: "later", label: "Noch Zeit" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20 md:pb-0">
      <AppHeader />
      <main className="container py-6 max-w-2xl flex-1">
        <div className="flex items-start justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" /> Vorrat
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Abgehakte Artikel mit geschätztem Ablaufdatum.
            </p>
          </div>
          {expiringSoonNames.length > 0 && (
            <Button asChild size="sm" className="shrink-0">
              <Link to={cookHref}>
                <ChefHat className="h-4 w-4" /> Was kochen?
              </Link>
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Noch keine Artikel im Vorrat.
              <br />
              Hake Artikel in deinen <Link to="/listen" className="text-primary underline">Listen</Link> ab,
              um sie hier zu sehen.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-2 mb-5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Vorrat durchsuchen…"
                  className="pl-9 pr-9"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground"
                    aria-label="Suche leeren"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-none">
                {urgencyTabs.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setUrgency(t.key)}
                    className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      urgency === t.key
                        ? "bg-primary text-primary-foreground border-primary font-medium"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {categories.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-none">
                  <button
                    onClick={() => setCategory("all")}
                    className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      category === "all"
                        ? "bg-secondary text-secondary-foreground border-secondary font-medium"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Alle Kategorien
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCategory(c)}
                      className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        category === c
                          ? "bg-secondary text-secondary-foreground border-secondary font-medium"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {filteredItems.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground space-y-3">
                  <div>Keine Artikel passen zu den Filtern.</div>
                  {filtersActive && (
                    <Button variant="outline" size="sm" onClick={resetFilters}>
                      Filter zurücksetzen
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <Section title="Abgelaufen" tone="urgent" items={groups.expired} onUsed={markUsed} onExtend={extend} />
            <Section
              title="Bald aufbrauchen"
              tone="urgent"
              items={groups.urgent}
              onUsed={markUsed}
              onExtend={extend}
            />
            <Section
              title="Diese Woche"
              tone="warn"
              items={groups.week}
              onUsed={markUsed}
              onExtend={extend}
            />
            <Section
              title="Noch Zeit"
              tone="ok"
              items={groups.later}
              onUsed={markUsed}
              onExtend={extend}
            />
              </div>
            )}
          </>
        )}
      </main>
      <div className="mt-auto">
        <AppFooter />
      </div>
    </div>
  );
};

const toneStyles = {
  urgent: {
    dot: "bg-destructive",
    bar: "bg-destructive",
    label: "text-destructive",
  },
  warn: {
    dot: "bg-amber-500",
    bar: "bg-amber-500",
    label: "text-amber-600 dark:text-amber-400",
  },
  ok: {
    dot: "bg-muted-foreground/40",
    bar: "bg-primary",
    label: "text-muted-foreground",
  },
} as const;

const Section = ({
  title,
  tone,
  items,
  onUsed,
  onExtend,
}: {
  title: string;
  tone: keyof typeof toneStyles;
  items: PantryItem[];
  onUsed: (id: string) => void;
  onExtend: (item: PantryItem) => void;
}) => {
  if (items.length === 0) return null;
  const styles = toneStyles[tone];
  return (
    <section>
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className={`h-2 w-2 rounded-full ${styles.dot}`} />
        <h2 className={`text-sm font-semibold ${styles.label}`}>{title}</h2>
        <span className="text-xs text-muted-foreground">({items.length})</span>
      </div>
      <div className="space-y-2">
        {items.map((it) => (
          <PantryRow key={it.id} item={it} tone={tone} onUsed={onUsed} onExtend={onExtend} />
        ))}
      </div>
    </section>
  );
};

const PantryRow = ({
  item,
  tone,
  onUsed,
  onExtend,
}: {
  item: PantryItem;
  tone: keyof typeof toneStyles;
  onUsed: (id: string) => void;
  onExtend: (item: PantryItem) => void;
}) => {
  const styles = toneStyles[tone];
  const days = item.ablauf_datum ? daysBetween(item.ablauf_datum) : 0;
  const total = item.haltbarkeit_tage ?? 14;
  const remaining = Math.max(0, Math.min(days, total));
  const pct = Math.max(4, Math.round((remaining / total) * 100));
  const icon = getProductIcon(item.name) ?? "🛒";

  const dateLabel =
    days < 0
      ? `Abgelaufen vor ${Math.abs(days)} Tag${Math.abs(days) === 1 ? "" : "en"}`
      : days === 0
        ? "Heute aufbrauchen!"
        : days === 1
          ? "Noch 1 Tag"
          : `Noch ${days} Tage`;

  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-3">
          <span className="text-xl shrink-0" aria-hidden>{icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <div className="font-medium truncate">
                {item.name}
                {item.menge ? (
                  <span className="text-muted-foreground font-normal text-sm ml-1.5">
                    {item.menge}{item.einheit ?? ""}
                  </span>
                ) : null}
              </div>
              <div className={`text-xs font-medium shrink-0 ${styles.label}`}>{dateLabel}</div>
            </div>
            <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
              <div className={`h-full ${styles.bar} transition-all`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
        <div className="flex gap-1.5 justify-end mt-2">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onExtend(item)}>
            <RotateCcw className="h-3 w-3" /> +3 Tage
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onUsed(item.id)}>
            <Trash2 className="h-3 w-3" /> Aufgegessen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PantryPage;