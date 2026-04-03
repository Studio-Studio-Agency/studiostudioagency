import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, ShoppingCart, TrendingUp, TrendingDown, Minus, Tag, Download, Wallet, AlertTriangle, CalendarDays, ArrowRightLeft } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
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
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, number>>({});
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [itemsRes, settingsRes] = await Promise.all([
        supabase.from("items").select("name, kategorie, checked_at, is_checked, created_at, preis").eq("user_id", user.id),
        supabase.from("user_settings").select("monthly_budget, category_budgets").eq("user_id", user.id).maybeSingle(),
      ]);
      setItems(itemsRes.data || []);
      if (settingsRes.data) {
        setMonthlyBudget((settingsRes.data as any).monthly_budget ?? null);
        const cb = (settingsRes.data as any).category_budgets;
        if (cb && typeof cb === "object") setCategoryBudgets(cb);
      }
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

  const categorySpending = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    const spending: Record<string, number> = {};
    items
      .filter(i => i.is_checked && i.checked_at && i.preis && !isBefore(new Date(i.checked_at), monthStart))
      .forEach(i => {
        const cat = i.kategorie || "Sonstiges";
        spending[cat] = (spending[cat] || 0) + (i.preis || 0);
      });
    return spending;
  }, [items]);

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

  const monthNames = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

  const yearlyData = useMemo(() => {
    const data = monthNames.map((name, idx) => ({ month: name, ausgaben: 0, artikel: 0 }));
    items.filter(i => i.is_checked && i.checked_at).forEach(item => {
      const d = new Date(item.checked_at);
      if (d.getFullYear() !== selectedYear) return;
      const m = d.getMonth();
      data[m].artikel++;
      data[m].ausgaben += item.preis || 0;
    });
    data.forEach(d => { d.ausgaben = Math.round(d.ausgaben * 100) / 100; });
    return data;
  }, [items, selectedYear]);

  const yearTotal = yearlyData.reduce((s, d) => s + d.ausgaben, 0);
  const yearArticles = yearlyData.reduce((s, d) => s + d.artikel, 0);
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    items.filter(i => i.checked_at).forEach(i => years.add(new Date(i.checked_at).getFullYear()));
    if (years.size === 0) years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
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

            {/* Budget warning */}
            {monthlyBudget != null && monthlyBudget > 0 && (
              <Card className={overBudget ? "border-destructive" : ""}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    {overBudget && <AlertTriangle className="h-4 w-4 text-destructive" />}
                    Monatsbudget
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>CHF {currentMonthSpent.toFixed(2)} von {monthlyBudget.toFixed(0)}</span>
                    <span className={`font-semibold ${overBudget ? "text-destructive" : "text-primary"}`}>
                      {budgetPercent?.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={budgetPercent ?? 0} className={`h-2 ${overBudget ? "[&>div]:bg-destructive" : ""}`} />
                  {overBudget && (
                    <p className="text-xs text-destructive font-medium">
                      ⚠️ Du hast dein Monatsbudget um CHF {(currentMonthSpent - monthlyBudget).toFixed(2)} überschritten!
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

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

            {/* Category budget tracking */}
            {Object.keys(categoryBudgets).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Kategorie-Budgets (aktueller Monat)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(categoryBudgets).map(([cat, budget]) => {
                    if (!budget || budget <= 0) return null;
                    const spent = categorySpending[cat] || 0;
                    const pct = Math.min((spent / budget) * 100, 100);
                    const over = spent > budget;
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{KATEGORIEN[cat] || "📦"} {cat}</span>
                          <span className={`font-medium ${over ? "text-destructive" : "text-muted-foreground"}`}>
                            CHF {spent.toFixed(0)} / {budget.toFixed(0)}
                          </span>
                        </div>
                        <Progress value={pct} className={`h-1.5 ${over ? "[&>div]:bg-destructive" : ""}`} />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

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

            {/* Yearly overview */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" /> Jahresübersicht
                  </CardTitle>
                  <div className="flex gap-1">
                    {availableYears.map(y => (
                      <button
                        key={y}
                        onClick={() => setSelectedYear(y)}
                        className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                          selectedYear === y
                            ? "bg-primary text-primary-foreground font-medium"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Ausgaben:</span>{" "}
                    <span className="font-semibold">{yearTotal > 0 ? `CHF ${yearTotal.toFixed(0)}` : "–"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Artikel:</span>{" "}
                    <span className="font-semibold">{yearArticles}</span>
                  </div>
                  {monthlyBudget && monthlyBudget > 0 && (
                    <div>
                      <span className="text-muted-foreground">Ø/Monat:</span>{" "}
                      <span className="font-semibold">
                        CHF {(yearTotal / Math.max(yearlyData.filter(d => d.ausgaben > 0).length, 1)).toFixed(0)}
                      </span>
                    </div>
                  )}
                </div>

                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={yearlyData}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={45} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        color: "hsl(var(--foreground))",
                      }}
                      formatter={(value: number, name: string) => [
                        name === "ausgaben" ? `CHF ${value.toFixed(2)}` : `${value} Artikel`,
                        name === "ausgaben" ? "Ausgaben" : "Artikel",
                      ]}
                    />
                    <Bar dataKey="ausgaben" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="ausgaben" />
                  </BarChart>
                </ResponsiveContainer>

                {yearlyData.some(d => d.artikel > 0) && (
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={yearlyData}>
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={30} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          color: "hsl(var(--foreground))",
                        }}
                        formatter={(value: number) => [`${value} Artikel`, "Gekauft"]}
                      />
                      <Line type="monotone" dataKey="artikel" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 3 }} name="artikel" />
                    </LineChart>
                  </ResponsiveContainer>
                )}

                {monthlyBudget && monthlyBudget > 0 && (
                  <p className="text-xs text-muted-foreground text-center">
                    Monatliches Budget: CHF {monthlyBudget.toFixed(0)} · Jahresbudget: CHF {(monthlyBudget * 12).toFixed(0)}
                  </p>
                )}
              </CardContent>
            </Card>
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
