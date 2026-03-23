import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, StickyNote, Loader2 } from "lucide-react";
import ListSkeleton from "@/components/ListSkeleton";

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

const NotesOverview = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editOpen, setEditOpen] = useState(false);

  const fetchNotes = async () => {
    if (!user) return;
    const { data, error } = await (supabase.from("notes") as any)
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return;
    }
    setNotes(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchNotes(); }, [user]);

  const createNote = async () => {
    if (!user || !newTitle.trim()) return;
    const { data, error } = await (supabase.from("notes") as any)
      .insert({ user_id: user.id, title: newTitle.trim() })
      .select()
      .single();

    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return;
    }
    setCreateOpen(false);
    setNewTitle("");
    navigate(`/notizen/${data.id}`);
  };

  const renameNote = async () => {
    if (!editId || !editTitle.trim()) return;
    const { error } = await (supabase.from("notes") as any)
      .update({ title: editTitle.trim() })
      .eq("id", editId);

    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return;
    }
    setEditOpen(false);
    setEditId(null);
    fetchNotes();
  };

  const deleteNote = async (id: string) => {
    const { error } = await (supabase.from("notes") as any).delete().eq("id", id);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return;
    }
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const getPreview = (content: string) => {
    if (!content) return "Leere Notiz";
    const lines = content.split("\n").filter(l => l.trim());
    return lines.slice(0, 2).join(" · ").substring(0, 80) + (lines.length > 2 ? "…" : "");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="flex-1 container py-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Notizen</h1>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Neue Notiz</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neue Notiz erstellen</DialogTitle>
              </DialogHeader>
              <Input
                placeholder="Titel der Notiz"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => e.key === "Enter" && createNote()}
                autoFocus
              />
              <Button onClick={createNote} disabled={!newTitle.trim()}>Erstellen</Button>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <ListSkeleton />
        ) : notes.length === 0 ? (
          <div className="text-center py-16">
            <StickyNote className="h-12 w-12 text-muted-foreground opacity-40 mx-auto mb-4" />
            <p className="text-muted-foreground">Noch keine Notizen. Erstelle deine erste!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notes.map(note => (
              <Card key={note.id} className="p-4 hover:bg-accent/50 transition-colors">
                <div className="flex items-start gap-3">
                  <Link to={`/notizen/${note.id}`} className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{note.title}</h3>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      {getPreview(note.content)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(note.updated_at).toLocaleDateString("de-CH")}
                    </p>
                  </Link>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => { setEditId(note.id); setEditTitle(note.title); setEditOpen(true); }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Notiz löschen?</AlertDialogTitle>
                          <AlertDialogDescription>"{note.title}" wird unwiderruflich gelöscht.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteNote(note.id)}>Löschen</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Rename dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Notiz umbenennen</DialogTitle></DialogHeader>
          <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && renameNote()} autoFocus />
          <Button onClick={renameNote} disabled={!editTitle.trim()}>Speichern</Button>
        </DialogContent>
      </Dialog>

      <AppFooter />
    </div>
  );
};

export default NotesOverview;
