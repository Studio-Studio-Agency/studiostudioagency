import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ShoppingCart, Trash2 } from "lucide-react";
import ListItemRow, { Item, KATEGORIEN } from "@/components/ListItemRow";
import goodgoodsLogo from "@/assets/goodgoods-logo-new.png";

const SharedListPage = () => {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();

  const [listName, setListName] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const call = async (action: string, payload?: object) => {
    const { data, error } = await supabase.functions.invoke("shared-list", {
      body: { action, token, payload },
    });
    if (error) throw error;
    return data;
  };

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const data = await call("get_list");
        setListName(data.list.name);
        setItems(data.items);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    const val = e.currentTarget.value.trim();
    if (e.key !== "Enter" || !val) return;
    e.currentTarget.value = "";
    try {
      const data = await call("add_item", { name: val });
      setItems(prev => [...prev, data.item]);
    } catch {
      toast({ title: "Fehler", description: "Artikel konnte nicht hinzugefügt werden.", variant: "destructive" });
    }
  };

  const toggleItem = async (item: Item) => {
    const nowChecked = !item.is_checked;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_checked: nowChecked, checked_at: nowChecked ? new Date().toISOString() : null } : i));
    try {
      await call("toggle_item", { itemId: item.id, isChecked: nowChecked });
    } catch {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_checked: item.is_checked, checked_at: item.checked_at } : i));
    }
  };

  const deleteItem = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    try {
      await call("delete_item", { itemId: id });
    } catch {
      toast({ title: "Fehler", description: "Artikel konnte nicht gelöscht werden.", variant: "destructive" });
    }
  };

  const unchecked = items.filter(i => !i.is_checked);
  const checked = items.filter(i => i.is_checked);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 text-center px-6">
        <ShoppingCart className="h-12 w-12 text-muted-foreground opacity-40" />
        <h1 className="text-xl font-semibold">Liste nicht gefunden</h1>
        <p className="text-muted-foreground text-sm">Dieser Link ist ungültig oder wurde gelöscht.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Simple header without auth */}
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="container flex items-center gap-2 h-16 max-w-2xl">
          <img src={goodgoodsLogo} alt="bling" className="h-6 w-auto" />
          <span className="text-muted-foreground text-sm ml-auto">Geteilte Liste</span>
        </div>
      </header>

      <main className="container py-6 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">{listName}</h1>

        <div className="space-y-1">
          {/* Unchecked items */}
          {unchecked.map(item => (
            <div key={item.id} className="flex items-center gap-3 py-1.5 group">
              <Checkbox
                checked={false}
                onCheckedChange={() => toggleItem(item)}
              />
              <span className="flex-1 text-foreground">{item.name}</span>
              {item.menge && (
                <span className="text-sm text-muted-foreground">
                  {item.menge} {item.einheit}
                </span>
              )}
              <button
                onClick={() => deleteItem(item.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          {/* New item input */}
          <div className="flex items-center gap-3 py-1.5">
            <Checkbox disabled className="opacity-30" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Artikel hinzufügen…"
              className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50"
              onKeyDown={handleKeyDown}
            />
          </div>

          {/* Checked items with full details */}
          {checked.length > 0 && (
            <div className="mt-8 pt-4 border-t border-border">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Gekauft ({checked.length})
              </h3>
              <div className="space-y-1">
                {checked.map(item => (
                  <ListItemRow
                    key={item.id}
                    item={item}
                    analyzing={false}
                    onToggle={() => toggleItem(item)}
                    onDelete={() => deleteItem(item.id)}
                    onRename={() => {}}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="mt-8 text-xs text-muted-foreground text-center">
          Du bearbeitest eine geteilte Liste · Änderungen sind für alle sichtbar
        </p>
      </main>
    </div>
  );
};

export default SharedListPage;
