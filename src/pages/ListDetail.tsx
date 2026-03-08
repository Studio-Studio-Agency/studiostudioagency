import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import ListItemRow, { Item } from "@/components/ListItemRow";
import ShareListDialog from "@/components/ShareListDialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const ListDetail = () => {
  const { id: listId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [listName, setListName] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  // Notepad new-line input
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    if (!listId) return;
    const { data: listData } = await supabase
      .from("lists").select("name").eq("id", listId).single();
    if (listData) setListName(listData.name);

    const { data: itemsData, error } = await supabase
      .from("items").select("*").eq("list_id", listId)
      .order("created_at", { ascending: true });

    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      setItems(itemsData || []);
    }
    setLoading(false);
  }, [listId, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addItem = async (name: string) => {
    if (!name.trim() || !user || !listId) return;
    const { data, error } = await supabase.from("items").insert({
      list_id: listId,
      user_id: user.id,
      name: name.trim(),
    }).select().single();

    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return;
    }
    if (data) {
      setItems(prev => [...prev, data as Item]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && e.currentTarget.value.trim()) {
      addItem(e.currentTarget.value);
      e.currentTarget.value = "";
    }
  };

  const toggleCheck = async (item: Item) => {
    const nowChecked = !item.is_checked;
    await supabase.from("items").update({
      is_checked: nowChecked,
      checked_at: nowChecked ? new Date().toISOString() : null,
    }).eq("id", item.id);

    setItems(prev =>
      prev.map(i => i.id === item.id
        ? { ...i, is_checked: nowChecked, checked_at: nowChecked ? new Date().toISOString() : null }
        : i)
    );

    if (nowChecked) {
      setAnalyzingId(item.id);
      try {
        const { data, error: fnError } = await supabase.functions.invoke("analyze-item", {
          body: { artikelName: item.name, menge: item.menge, einheit: item.einheit, itemId: item.id },
        });
        if (fnError) throw fnError;
        if (data?.success) {
          const a = data.analysis;
          setItems(prev =>
            prev.map(i => i.id === item.id ? {
              ...i,
              ist_lebensmittel: a.istLebensmittel, kategorie: a.kategorie,
              haltbarkeit_tage: a.haltbarkeitTage, erinnerung_vor_tagen: a.erinnerungVorTagen,
              ablauf_datum: a.ablaufDatum, erklaerung: a.erklaerung, lagerhinweis: a.lagerhinweis,
            } : i)
          );
        }
      } catch (err) {
        console.error("Analysis error:", err);
      }
      setAnalyzingId(null);
    }
  };

  const deleteItem = async (id: string) => {
    await supabase.from("items").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const renameItem = async (id: string, newName: string) => {
    if (!newName.trim()) return;
    await supabase.from("items").update({ name: newName.trim() }).eq("id", id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, name: newName.trim() } : i));
  };

  const uncheckedItems = items.filter(i => !i.is_checked);
  const checkedItems = items.filter(i => i.is_checked);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 max-w-2xl">
        <button onClick={() => navigate("/listen")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Zurück
        </button>

        <h1 className="text-2xl font-bold mb-6">{listName || "..."}</h1>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-1">
            {/* Unchecked items as notepad lines */}
            {uncheckedItems.map(item => (
              <ListItemRow
                key={item.id}
                item={item}
                analyzing={analyzingId === item.id}
                onToggle={() => toggleCheck(item)}
                onDelete={() => deleteItem(item.id)}
                onRename={(n) => renameItem(item.id, n)}
              />
            ))}

            {/* Always-visible new line input */}
            <div className="flex items-center gap-3">
              <div className="pt-0.5">
                <Checkbox disabled className="opacity-30" />
              </div>
              <input
                ref={inputRef}
                type="text"
                placeholder="Neuer Artikel…"
                className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50"
                onKeyDown={handleKeyDown}
                autoFocus
              />
            </div>

            {/* Checked items */}
            {checkedItems.length > 0 && (
              <div className="mt-8 pt-4 border-t border-border">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Erledigt ({checkedItems.length})
                </h3>
                <div className="space-y-1">
                  {checkedItems.map(item => (
                    <ListItemRow
                      key={item.id}
                      item={item}
                      analyzing={analyzingId === item.id}
                      onToggle={() => toggleCheck(item)}
                      onDelete={() => deleteItem(item.id)}
                      onRename={(n) => renameItem(item.id, n)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default ListDetail;
