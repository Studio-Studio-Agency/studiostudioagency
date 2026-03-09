import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ShoppingCart, Loader2, ScanLine } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppFooter from "@/components/AppFooter";
import ListSkeleton from "@/components/ListSkeleton";

interface ListItem {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  item_count?: number;
}

const ListsOverview = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [lists, setLists] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const fetchLists = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("lists")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      toast({ title: "Fehler beim Laden", description: error.message, variant: "destructive" });
      return;
    }

    // Get item counts
    const listsWithCounts = await Promise.all(
      (data || []).map(async (list) => {
        const { count } = await supabase
          .from("items")
          .select("*", { count: "exact", head: true })
          .eq("list_id", list.id);
        return { ...list, item_count: count || 0 };
      })
    );

    setLists(listsWithCounts);
    setLoading(false);
  };

  useEffect(() => {
    fetchLists();
  }, [user]);

  const createList = async () => {
    if (!newName.trim() || !user) return;
    const { error } = await supabase
      .from("lists")
      .insert({ name: newName.trim(), user_id: user.id });

    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return;
    }
    setNewName("");
    setCreateOpen(false);
    fetchLists();
    toast({ title: "Liste erstellt ✅" });
  };

  const renameList = async () => {
    if (!editName.trim() || !editId) return;
    const { error } = await supabase
      .from("lists")
      .update({ name: editName.trim() })
      .eq("id", editId);

    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return;
    }
    setEditOpen(false);
    setEditId(null);
    fetchLists();
  };

  const deleteList = async (id: string) => {
    const { error } = await supabase.from("lists").delete().eq("id", id);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return;
    }
    fetchLists();
    toast({ title: "Liste gelöscht" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <main className="container py-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Meine Einkaufslisten</h1>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate("/scan")}>
              <ScanLine className="h-4 w-4 mr-1" /> Bon scannen
            </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Neue Liste</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neue Einkaufsliste</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createList(); }} className="space-y-4">
                <Input
                  placeholder="Name der Liste"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                />
                <Button type="submit" className="w-full" disabled={!newName.trim()}>Erstellen</Button>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {loading ? (
          <ListSkeleton count={3} />
        ) : lists.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground animate-fade-in">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg">Erstelle deine erste Einkaufsliste 🛒</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lists.map((list) => (
              <Card key={list.id} className="p-4 animate-slide-up">
                <div className="flex items-center justify-between">
                  <Link to={`/listen/${list.id}`} className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{list.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {list.item_count} {list.item_count === 1 ? "Artikel" : "Artikel"}
                    </p>
                  </Link>
                  <div className="flex gap-1 ml-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditId(list.id);
                        setEditName(list.name);
                        setEditOpen(true);
                      }}
                    >
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
                          <AlertDialogTitle>Liste löschen?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Die Liste "{list.name}" und alle Artikel werden unwiderruflich gelöscht.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteList(list.id)}>Löschen</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Rename Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Liste umbenennen</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); renameList(); }} className="space-y-4">
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
              <Button type="submit" className="w-full" disabled={!editName.trim()}>Speichern</Button>
            </form>
          </DialogContent>
        </Dialog>
      </main>
      <div className="mt-auto">
        <AppFooter />
      </div>
    </div>
  );
};

export default ListsOverview;
