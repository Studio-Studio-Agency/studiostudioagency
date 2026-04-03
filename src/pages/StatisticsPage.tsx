import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, ShoppingCart, TrendingUp, TrendingDown, Minus, Tag, Download, Wallet, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { KATEGORIEN } from "@/components/ListItemRow";
import { startOfWeek, startOfMonth, format, subWeeks, isAfter, isBefore } from "date-fns";
import { de } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(210, 60%, 50%)",
  "hsl(340, 60%, 50%)",
  "hsl(45, 70%, 50%)",
  "hsl(160, 50%, 45%)",
  "hsl(270, 50%, 55%)",
  "hsl(20, 70%, 50%)",
];

const StatisticsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthlyBudget, setMonthlyBudget] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [itemsRes, settingsRes] = await Promise.all([
        supabase.from("items").select("name, kategorie, checked_at, is_checked, created_at, preis").eq("user_id", user.id),
        supabase.from("user_settings").select("monthly_budget").eq("user_id", user.id).maybeSingle(),
      ]);
      setItems(itemsRes.data || []);
      if (settingsRes.data) setMonthlyBudget((settingsRes.data as any).monthly_budget ?? null);
      setLoading(false);
    };
    load();
  }, [user]);

  const weeklyData = useMemo(() => {
    const checkedItems = items.filter(i => i.is_checked && i.checked_at);
    const weeks: Record<string, number> = {};
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      const key = format(weekStart, "dd.MM", { locale: de });
      weeks[key] = 0;
    }
    checkedItems.forEach(item => {
      const date = new Date(item.checked_at);
      const eightWeeksAgo = subWeeks(now, 8);
      if (!isAfter(date, eightWeeksAgo)) return;
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const key = format(weekStart, "dd.MM", { locale: de });
      if (key in weeks) weeks[key]++;
    });
    return Object.entries(weeks).map(([week, count]) => ({ week, count }));
  }, [items]);

  // Trend: this week vs last week
  const trend = useMemo(() => {
    const checkedItems = items.filter(i => i.is_checked && i.checked_at);
    const now = new Date();
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

    const thisWeekCount = checkedItems.filter(i => {
      const d = new Date(i.checked_at);
      return !isBefore(d, thisWeekStart);
    }).length;

    const lastWeekCount = checkedItems.filter(i => {
      const d = new Date(i.checked_at);
      return !isBefore(d, lastWeekStart) && isBefore(d, thisWeekStart);
    }).length;

    const diff = thisWeekCount - lastWeekCount;
    const percent = lastWeekCount > 0 ? Math.round((diff / lastWeekCount) * 100) : null;

    return { thisWeekCount, lastWeekCount, diff, percent };
  }, [items]);

  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach(item => {
      const cat = item.kategorie || "Sonstiges";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value, emoji: KATEGORIEN[name] || "📦" }))
      .sort((a, b) => b.value - a.value);
  }, [items]);

  const totalItems = items.length;
  const checkedCount = items.filter(i => i.is_checked).length;
  const categoryCount = new Set(items.map(i => i.kategorie).filter(Boolean)).size;
  const totalSpent = items.reduce((sum, i) => sum + (i.preis || 0), 0);

  const currentMonthSpent = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    return items
      .filter(i => i.is_checked && i.checked_at && i.preis && !isBefore(new Date(i.checked_at), monthStart))
      .reduce((sum, i) => sum + (i.preis || 0), 0);
  }, [items]);

  const budgetPercent = monthlyBudget && monthlyBudget > 0 ? Math.min((currentMonthSpent / monthlyBudget) * 100, 100) : null;
  const overBudget = monthlyBudget && monthlyBudget > 0 && currentMonthSpent > monthlyBudget;

  const monthlySpending = useMemo(() => {
    const months: Record<string, number> = {};
    items.filter(i => i.is_checked && i.checked_at && i.preis).forEach(item => {
      const key = format(new Date(item.checked_at), "MM/yyyy");
      months[key] = (months[key] || 0) + (item.preis || 0);
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, total]) => ({ month, total: Math.round(total * 100) / 100 }));
  }, [items]);

  const exportCSV = useCallback(() => {
    const header = "Name,Kategorie,Preis (CHF),Gekauft,Gekauft am,Erstellt am\n";
    const rows = items.map(i =>
      [
        `"${(i.name || "").replace(/"/g, '""')}"`,
        `"${i.kategorie || "Sonstiges"}"`,
        i.preis != null ? i.preis.toFixed(2) : "",
        i.is_checked ? "Ja" : "Nein",
        i.checked_at ? format(new Date(i.checked_at), "dd.MM.yyyy HH:mm", { locale: de }) : "",
        format(new Date(i.created_at), "dd.MM.yyyy HH:mm", { locale: de }),
      ].join(",")
    ).join("\n");

    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `einkaufsstatistik_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [items]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <main className="container py-6 max-w-2xl pb-24">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Zurück
        </button>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Statistiken</h1>
          {!loading && items.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> CSV Export
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <ShoppingCart className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-bold">{totalItems}</p>
                  <p className="text-xs text-muted-foreground">Artikel gesamt</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <TrendingUp className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-bold">{checkedCount}</p>
                  <p className="text-xs text-muted-foreground">Gekauft</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <Tag className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-bold">{categoryCount}</p>
                  <p className="text-xs text-muted-foreground">Kategorien</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <Wallet className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-bold">{totalSpent > 0 ? `${totalSpent.toFixed(0)}` : "–"}</p>
                  <p className="text-xs text-muted-foreground">CHF ausgegeben</p>
                </CardContent>
              </Card>
            </div>

            {/* Trend comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Wochenvergleich</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full ${
                    trend.diff > 0 ? "bg-primary/10" : trend.diff < 0 ? "bg-destructive/10" : "bg-muted"
                  }`}>
                    {trend.diff > 0 ? (
                      <TrendingUp className="h-6 w-6 text-primary" />
                    ) : trend.diff < 0 ? (
                      <TrendingDown className="h-6 w-6 text-destructive" />
                    ) : (
                      <Minus className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      Diese Woche: <span className="font-bold">{trend.thisWeekCount}</span> Artikel
                      {trend.percent !== null && (
                        <span className={`ml-2 text-xs font-semibold ${
                          trend.diff > 0 ? "text-primary" : trend.diff < 0 ? "text-destructive" : "text-muted-foreground"
                        }`}>
                          {trend.diff > 0 ? "+" : ""}{trend.percent}%
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Letzte Woche: {trend.lastWeekCount} Artikel
                      {trend.diff !== 0 && (
                        <span> · {Math.abs(trend.diff)} {trend.diff > 0 ? "mehr" : "weniger"}</span>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Weekly chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Gekaufte Artikel pro Woche</CardTitle>
              </CardHeader>
              <CardContent>
                {weeklyData.every(d => d.count === 0) ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Noch keine Daten vorhanden.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={weeklyData}>
                      <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={30} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          color: "hsl(var(--foreground))",
                        }}
                        formatter={(value: number) => [`${value} Artikel`, "Gekauft"]}
                        labelFormatter={(label) => `KW ab ${label}`}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Category breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Häufigste Kategorien</CardTitle>
              </CardHeader>
              <CardContent>
                {categoryData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Noch keine Daten vorhanden.</p>
                ) : (
                  <div className="flex flex-col md:flex-row items-center gap-4">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={categoryData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={40}
                        >
                          {categoryData.map((_, idx) => (
                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 8,
                            color: "hsl(var(--foreground))",
                          }}
                          formatter={(value: number, name: string) => [`${value} Artikel`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 w-full">
                      {categoryData.slice(0, 8).map((cat, idx) => (
                        <div key={cat.name} className="flex items-center gap-2 text-sm">
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                          <span className="truncate">{cat.emoji} {cat.name}</span>
                          <span className="ml-auto text-muted-foreground font-medium">{cat.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Monthly spending */}
            {monthlySpending.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Monatliche Ausgaben (CHF)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={monthlySpending}>
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={45} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          color: "hsl(var(--foreground))",
                        }}
                        formatter={(value: number) => [`CHF ${value.toFixed(2)}`, "Ausgaben"]}
                      />
                      <Bar dataKey="total" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
      <div className="mt-auto">
        <AppFooter />
      </div>
    </div>
  );
};

export default StatisticsPage;
