import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle, X } from "lucide-react";
import { Link } from "react-router-dom";

interface ExpiringItem {
  id: string;
  name: string;
  ablauf_datum: string;
  list_id: string;
  tage: number;
}

const ExpiryBanner = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<ExpiringItem[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + 3);

      const { data } = await supabase
        .from("items")
        .select("id, name, ablauf_datum, list_id")
        .eq("user_id", user.id)
        .eq("is_checked", true)
        .not("ablauf_datum", "is", null)
        .lte("ablauf_datum", cutoff.toISOString().split("T")[0])
        .order("ablauf_datum", { ascending: true })
        .limit(5);

      if (data && data.length > 0) {
        const today = new Date();
        setItems(data.map(item => ({
          ...item,
          tage: Math.ceil((new Date(item.ablauf_datum!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
        })));
      }
    };
    check();
  }, [user]);

  if (dismissed || items.length === 0) return null;

  const expiredCount = items.filter(i => i.tage <= 0).length;
  const soonCount = items.filter(i => i.tage > 0).length;

  return (
    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4 animate-fade-in">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {expiredCount > 0 && `${expiredCount} abgelaufen`}
            {expiredCount > 0 && soonCount > 0 && " · "}
            {soonCount > 0 && `${soonCount} laufen bald ab`}
          </p>
          <div className="mt-1 space-y-0.5">
            {items.slice(0, 3).map(item => (
              <Link
                key={item.id}
                to={`/listen/${item.list_id}`}
                className="block text-xs text-muted-foreground hover:text-foreground"
              >
                {item.tage <= 0 ? "🔴" : item.tage <= 2 ? "🟠" : "🟡"} {item.name}
                {item.tage <= 0
                  ? ` (seit ${Math.abs(item.tage)} ${Math.abs(item.tage) === 1 ? "Tag" : "Tagen"} abgelaufen)`
                  : ` (noch ${item.tage} ${item.tage === 1 ? "Tag" : "Tage"})`
                }
              </Link>
            ))}
            {items.length > 3 && (
              <p className="text-xs text-muted-foreground">
                +{items.length - 3} weitere
              </p>
            )}
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default ExpiryBanner;
