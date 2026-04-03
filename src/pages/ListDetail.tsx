import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import ListItemRow, { Item, KATEGORIEN } from "@/components/ListItemRow";
import ShareListDialog from "@/components/ShareListDialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import RecipeImportDialog from "@/components/RecipeImportDialog";
import { getCategorySortIndex } from "@/lib/categoryOrder";

const ListDetail = () => {
  const { id: listId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [listName, setListName] = useState("");
  const [editToken, setEditToken] = useState<string | undefined>();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'red' | 'orange' | 'yellow' | 'green'>('all');
  const [filterKategorie, setFilterKategorie] = useState<string>('all');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Notepad new-line input
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    if (!listId) return;
    const { data: listData } = await supabase
      .from("lists").select("name, edit_token").eq("id", listId).single();
    if (listData) {
      setListName(listData.name);
      setEditToken(listData.edit_token);
    }

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

  // Realtime subscription for collaborative editing
  useEffect(() => {
    if (!listId) return;
    const channel = supabase
      .channel(`list-items-${listId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'items', filter: `list_id=eq.${listId}` },
        (payload) => {
          const newItem = payload.new as Item;
          setItems(prev => {
            if (prev.some(i => i.id === newItem.id)) return prev;
            return [...prev, newItem];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'items', filter: `list_id=eq.${listId}` },
        (payload) => {
          const updated = payload.new as Item;
          setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'items', filter: `list_id=eq.${listId}` },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;
          setItems(prev => prev.filter(i => i.id !== deletedId));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [listId]);

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
      const newItem = data as Item;
      setItems(prev => [...prev, newItem]);

      // Auto-categorize in background
      setAnalyzingId(newItem.id);
      try {
        const { data: aiData, error: fnError } = await supabase.functions.invoke("analyze-item", {
          body: { artikelName: newItem.name, menge: newItem.menge, einheit: newItem.einheit, itemId: newItem.id },
        });
        if (!fnError && aiData?.success) {
          const a = aiData.analysis;
          setItems(prev =>
            prev.map(i => i.id === newItem.id ? {
              ...i,
              ist_lebensmittel: a.istLebensmittel, kategorie: a.kategorie,
              haltbarkeit_tage: a.haltbarkeitTage, erinnerung_vor_tagen: a.erinnerungVorTagen,
              ablauf_datum: a.ablaufDatum, erklaerung: a.erklaerung, lagerhinweis: a.lagerhinweis,
            } : i)
          );
        }
      } catch (err) {
        console.error("Auto-categorize error:", err);
      }
      setAnalyzingId(null);
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

  const getLifecycleStatus = (item: Item): 'red' | 'orange' | 'yellow' | 'green' => {
    if (!item.ablauf_datum) return 'green';
    const days = Math.ceil((new Date(item.ablauf_datum).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days <= 0) return 'red';
    if (days <= 2) return 'orange';
    if (days <= 5) return 'yellow';
    return 'green';
  };

  const statusCounts = {
    red: checkedItems.filter(i => getLifecycleStatus(i) === 'red').length,
    orange: checkedItems.filter(i => getLifecycleStatus(i) === 'orange').length,
    yellow: checkedItems.filter(i => getLifecycleStatus(i) === 'yellow').length,
    green: checkedItems.filter(i => getLifecycleStatus(i) === 'green').length,
  };

  // Collect unique categories from checked items
  const kategorienInList = Array.from(new Set(checkedItems.map(i => i.kategorie).filter(Boolean))) as string[];

  const filteredCheckedItems = checkedItems.filter(i => {
    const statusMatch = filterStatus === 'all' || getLifecycleStatus(i) === filterStatus;
    const katMatch = filterKategorie === 'all' || i.kategorie === filterKategorie;
    return statusMatch && katMatch;
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <main className="container py-6 max-w-2xl">
        <button onClick={() => navigate("/listen")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Zurück
        </button>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{listName || "..."}</h1>
          <div className="flex items-center gap-2">
            {listId && user && (
              <RecipeImportDialog listId={listId} userId={user.id} onItemsAdded={fetchData} />
            )}
            {listId && <ShareListDialog listId={listId} listName={listName} editToken={editToken} />}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-1">
            {/* Unchecked items grouped by category */}
            {(() => {
              const grouped: Record<string, Item[]> = {};
              uncheckedItems.forEach(item => {
                const cat = item.kategorie || "Sonstiges";
                if (!grouped[cat]) grouped[cat] = [];
                grouped[cat].push(item);
              });
              // Sort categories: known ones first, Sonstiges last
              const sortedCats = Object.keys(grouped).sort((a, b) => {
                return getCategorySortIndex(a) - getCategorySortIndex(b);
              });
              const hasMultipleCategories = sortedCats.length > 1 || (sortedCats.length === 1 && sortedCats[0] !== "Sonstiges");

              const toggleCollapse = (cat: string) => {
                setCollapsedCategories(prev => {
                  const next = new Set(prev);
                  if (next.has(cat)) next.delete(cat);
                  else next.add(cat);
                  return next;
                });
              };

              return sortedCats.map(cat => {
                const isCollapsed = collapsedCategories.has(cat);
                return (
                  <div key={cat}>
                    {hasMultipleCategories && (
                      <button
                        onClick={() => toggleCollapse(cat)}
                        className="flex items-center gap-2 mt-4 mb-1.5 first:mt-0 w-full text-left group"
                      >
                        {isCollapsed
                          ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        }
                        <span className="text-base">{KATEGORIEN[cat] || "📦"}</span>
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{cat}</span>
                        <span className="text-xs text-muted-foreground">({grouped[cat].length})</span>
                        <div className="flex-1 h-px bg-border" />
                      </button>
                    )}
                    {!isCollapsed && grouped[cat].map(item => (
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
                );
              });
            })()}

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
                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Gekauft ({checkedItems.length})
                  </h3>
                </div>

                {/* Lifecycle filter */}
                <div className="flex gap-1 flex-wrap mb-2">
                  {([
                    { key: 'all' as const, label: 'Alle', count: checkedItems.length },
                    { key: 'red' as const, label: '🔴', count: statusCounts.red },
                    { key: 'orange' as const, label: '🟠', count: statusCounts.orange },
                    { key: 'yellow' as const, label: '🟡', count: statusCounts.yellow },
                    { key: 'green' as const, label: '🟢', count: statusCounts.green },
                  ] as const).filter(f => f.key === 'all' || f.count > 0).map(f => (
                    <button
                      key={f.key}
                      onClick={() => setFilterStatus(f.key)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        filterStatus === f.key
                          ? 'bg-accent text-accent-foreground border-accent font-medium'
                          : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                      }`}
                    >
                      {f.label} {f.count}
                    </button>
                  ))}
                </div>

                {/* Kategorie filter */}
                {kategorienInList.length > 1 && (
                  <div className="flex gap-1 flex-wrap mb-3">
                    <button
                      onClick={() => setFilterKategorie('all')}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        filterKategorie === 'all'
                          ? 'bg-primary text-primary-foreground border-primary font-medium'
                          : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                      }`}
                    >
                      Alle Kategorien
                    </button>
                    {kategorienInList.map(kat => (
                      <button
                        key={kat}
                        onClick={() => setFilterKategorie(kat)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                          filterKategorie === kat
                            ? 'bg-primary text-primary-foreground border-primary font-medium'
                            : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                        }`}
                      >
                        {KATEGORIEN[kat] || "📦"} {kat}
                      </button>
                    ))}
                  </div>
                )}
                <div className="space-y-1">
                  {filteredCheckedItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2 text-center">
                      Keine Items in dieser Kategorie.
                    </p>
                  ) : (
                    filteredCheckedItems.map(item => (
                      <ListItemRow
                        key={item.id}
                        item={item}
                        analyzing={analyzingId === item.id}
                        onToggle={() => toggleCheck(item)}
                        onDelete={() => deleteItem(item.id)}
                        onRename={(n) => renameItem(item.id, n)}
                      />
                    ))
                  )}
                </div>
              </div>
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

export default ListDetail;
