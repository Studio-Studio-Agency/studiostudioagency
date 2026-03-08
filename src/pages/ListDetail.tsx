import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ArrowLeft, Pencil, Loader2, Undo2 } from "lucide-react";

const EINHEITEN = ["Stück", "kg", "Gramm", "Liter", "Packung", "Dose", "Flasche"];

interface Item {
  id: string;
  name: string;
  menge: number | null;
  einheit: string | null;
  is_checked: boolean;
  checked_at: string | null;
  ist_lebensmittel: boolean | null;
  kategorie: string | null;
  haltbarkeit_tage: number | null;
  erinnerung_vor_tagen: number | null;
  ablauf_datum: string | null;
  erklaerung: string | null;
  lagerhinweis: string | null;
  created_at: string;
}

const ListDetail = () => {
  const { id: listId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [listName, setListName] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // New item form
  const [newName, setNewName] = useState("");
  const [newMenge, setNewMenge] = useState("");
  const [newEinheit, setNewEinheit] = useState("Stück");

  // Edit item
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editMenge, setEditMenge] = useState("");
  const [editEinheit, setEditEinheit] = useState("Stück");

  // Analyzing state
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const fetchData = async () => {
    if (!listId) return;

    const { data: listData } = await supabase
      .from("lists")
      .select("name")
      .eq("id", listId)
      .single();

    if (listData) setListName(listData.name);

    const { data: itemsData, error } = await supabase
      .from("items")
      .select("*")
      .eq("list_id", listId)
      .order("created_at", { ascending: true });

    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      setItems(itemsData || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [listId]);

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !user || !listId) return;

    const { error } = await supabase.from("items").insert({
      list_id: listId,
      user_id: user.id,
      name: newName.trim(),
      menge: newMenge ? parseFloat(newMenge) : null,
      einheit: newEinheit,
    });

    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return;
    }
    setNewName("");
    setNewMenge("");
    fetchData();
  };

  const toggleCheck = async (item: Item) => {
    const nowChecked = !item.is_checked;
    const { error } = await supabase
      .from("items")
      .update({
        is_checked: nowChecked,
        checked_at: nowChecked ? new Date().toISOString() : null,
      })
      .eq("id", item.id);

    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return;
    }

    // Update local state immediately
    setItems(prev =>
      prev.map(i => i.id === item.id
        ? { ...i, is_checked: nowChecked, checked_at: nowChecked ? new Date().toISOString() : null }
        : i
      )
    );

    // If checking (= bought), trigger AI analysis
    if (nowChecked) {
      setAnalyzingId(item.id);
      try {
        const { data, error: fnError } = await supabase.functions.invoke("analyze-item", {
          body: {
            artikelName: item.name,
            menge: item.menge,
            einheit: item.einheit,
            itemId: item.id,
          },
        });

        if (fnError) throw fnError;

        if (data?.error) {
          toast({ title: "KI-Fehler", description: data.message, variant: "destructive" });
        } else if (data?.success) {
          // Update local item with analysis results
          const a = data.analysis;
          setItems(prev =>
            prev.map(i => i.id === item.id ? {
              ...i,
              ist_lebensmittel: a.istLebensmittel,
              kategorie: a.kategorie,
              haltbarkeit_tage: a.haltbarkeitTage,
              erinnerung_vor_tagen: a.erinnerungVorTagen,
              ablauf_datum: a.ablaufDatum,
              erklaerung: a.erklaerung,
              lagerhinweis: a.lagerhinweis,
            } : i)
          );
        }
      } catch (err) {
        console.error("Analysis error:", err);
        toast({ title: "Analyse fehlgeschlagen", description: "Bitte versuche es erneut.", variant: "destructive" });
      }
      setAnalyzingId(null);
    }
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return;
    }
    fetchData();
  };

  const saveEdit = async () => {
    if (!editItem || !editName.trim()) return;
    const { error } = await supabase
      .from("items")
      .update({
        name: editName.trim(),
        menge: editMenge ? parseFloat(editMenge) : null,
        einheit: editEinheit,
      })
      .eq("id", editItem.id);

    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return;
    }
    setEditOpen(false);
    fetchData();
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

        {/* Add item form */}
        <form onSubmit={addItem} className="flex gap-2 mb-6">
          <Input
            placeholder="Artikel hinzufügen"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1"
          />
          <Input
            type="number"
            placeholder="Menge"
            value={newMenge}
            onChange={(e) => setNewMenge(e.target.value)}
            className="w-20"
            step="any"
          />
          <Select value={newEinheit} onValueChange={setNewEinheit}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EINHEITEN.map(e => (
                <SelectItem key={e} value={e}>{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" size="icon" disabled={!newName.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </form>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground animate-fade-in">
            <p className="text-lg">Füge deinen ersten Artikel hinzu ✏️</p>
          </div>
        ) : (
          <>
            {/* Unchecked items */}
            <div className="space-y-2 mb-6">
              {uncheckedItems.map(item => (
                <ItemRow
                  key={item.id}
                  item={item}
                  analyzing={analyzingId === item.id}
                  onToggle={() => toggleCheck(item)}
                  onEdit={() => {
                    setEditItem(item);
                    setEditName(item.name);
                    setEditMenge(item.menge?.toString() || "");
                    setEditEinheit(item.einheit || "Stück");
                    setEditOpen(true);
                  }}
                  onDelete={() => deleteItem(item.id)}
                />
              ))}
            </div>

            {/* Checked items */}
            {checkedItems.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  ✅ Bereits gekauft ({checkedItems.length})
                </h3>
                <div className="space-y-2">
                  {checkedItems.map(item => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      analyzing={analyzingId === item.id}
                      onToggle={() => toggleCheck(item)}
                      onEdit={() => {
                        setEditItem(item);
                        setEditName(item.name);
                        setEditMenge(item.menge?.toString() || "");
                        setEditEinheit(item.einheit || "Stück");
                        setEditOpen(true);
                      }}
                      onDelete={() => deleteItem(item.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* All checked */}
            {uncheckedItems.length === 0 && checkedItems.length > 0 && (
              <div className="text-center py-8 text-muted-foreground animate-fade-in">
                <p className="text-lg">Super! Alles eingekauft 🎉</p>
              </div>
            )}
          </>
        )}

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Artikel bearbeiten</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveEdit(); }} className="space-y-4">
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" autoFocus />
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={editMenge}
                  onChange={(e) => setEditMenge(e.target.value)}
                  placeholder="Menge"
                  step="any"
                  className="flex-1"
                />
                <Select value={editEinheit} onValueChange={setEditEinheit}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EINHEITEN.map(e => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">Speichern</Button>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

const ItemRow = ({
  item,
  analyzing,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: Item;
  analyzing: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const kategorieEmoji: Record<string, string> = {
    "Obst": "🍎",
    "Gemüse": "🥦",
    "Fleisch & Fisch": "🥩",
    "Milchprodukte": "🧀",
    "Backwaren": "🍞",
    "Getränke": "🥤",
    "Tiefkühl": "🧊",
    "Konserven": "🥫",
    "Haushalt": "🧹",
    "Technik": "💻",
    "Sonstiges": "📦",
  };

  const getExpiryColor = () => {
    if (!item.ablauf_datum) return "";
    const days = Math.ceil((new Date(item.ablauf_datum).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 2) return "text-fresh-red";
    if (days <= 5) return "text-fresh-yellow";
    return "text-fresh-green";
  };

  return (
    <Card className={`p-3 animate-slide-up ${item.is_checked ? "opacity-70" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="pt-0.5">
          <Checkbox
            checked={item.is_checked}
            onCheckedChange={onToggle}
            className={item.is_checked ? "animate-check" : ""}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium ${item.is_checked ? "line-through text-muted-foreground" : ""}`}>
              {item.name}
            </span>
            {item.menge && (
              <span className="text-sm text-muted-foreground">
                {item.menge} {item.einheit}
              </span>
            )}
          </div>

          {analyzing && (
            <p className="text-sm text-primary mt-1 animate-fade-in">
              🔍 KI analysiert…
            </p>
          )}

          {/* Info card after analysis */}
          {item.is_checked && item.kategorie && !analyzing && (
            <div className="mt-2 p-2 rounded-md bg-accent text-sm space-y-1 animate-fade-in">
              <div className="flex items-center gap-2">
                <span>{kategorieEmoji[item.kategorie] || "📦"}</span>
                <span className="font-medium text-accent-foreground">{item.kategorie}</span>
              </div>
              {item.checked_at && (
                <p className="text-muted-foreground">
                  Gekauft: {new Date(item.checked_at).toLocaleDateString("de-CH")}
                </p>
              )}
              {item.ablauf_datum && (
                <p className={getExpiryColor()}>
                  Ablauf: {new Date(item.ablauf_datum).toLocaleDateString("de-CH")}
                </p>
              )}
              {item.erklaerung && <p className="text-muted-foreground">{item.erklaerung}</p>}
              {item.lagerhinweis && <p className="text-muted-foreground">💡 {item.lagerhinweis}</p>}
            </div>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          {item.is_checked && (
            <Button variant="ghost" size="icon" onClick={onToggle} title="Rückgängig">
              <Undo2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Artikel löschen?</AlertDialogTitle>
                <AlertDialogDescription>"{item.name}" wird unwiderruflich gelöscht.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Löschen</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </Card>
  );
};

export default ListDetail;
