import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, ShoppingCart, TrendingUp, Tag } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { KATEGORIEN } from "@/components/ListItemRow";
import { startOfWeek, format, subWeeks, isAfter } from "date-fns";
import { de } from "date-fns/locale";

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

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("items")
        .select("name, kategorie, checked_at, is_checked, created_at")
        .eq("user_id", user.id);
      setItems(data || []);
      setLoading(false);
    };
    load();
  }, [user]);

  const weeklyData = useMemo(() => {
    const checkedItems = items.filter(i => i.is_checked && i.checked_at);
    const weeks: Record<string, number> = {};
    const now = new Date();
    // Initialize last 8 weeks
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <main className="container py-6 max-w-2xl pb-24">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Zurück
        </button>
        <h1 className="text-2xl font-bold mb-6">Statistiken</h1>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
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
            </div>

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
