import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Share2, Copy, Check, Eye, Pencil } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ShareListDialogProps {
  listId: string;
  listName: string;
  editToken?: string;
}

const ShareListDialog = ({ listId, listName, editToken }: ShareListDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [copiedView, setCopiedView] = useState(false);
  const [copiedEdit, setCopiedEdit] = useState(false);

  const viewUrl = `${window.location.origin}/listen/${listId}`;
  const editUrl = editToken ? `${window.location.origin}/teilen/${editToken}` : null;

  const copyToClipboard = async (text: string, type: "view" | "edit") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "view") {
        setCopiedView(true);
        setTimeout(() => setCopiedView(false), 2000);
      } else {
        setCopiedEdit(true);
        setTimeout(() => setCopiedEdit(false), 2000);
      }
      toast({ title: "Link kopiert!", description: "Der Link wurde in die Zwischenablage kopiert." });
    } catch {
      toast({ title: "Fehler", description: "Link konnte nicht kopiert werden.", variant: "destructive" });
    }
  };

  const handleNativeShare = async (url: string, mode: "view" | "edit") => {
    const modeText = mode === "edit" ? "bearbeiten" : "ansehen";
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Einkaufsliste: ${listName}`,
          text: `${mode === "edit" ? "Bearbeite" : "Schau dir"} meine Einkaufsliste "${listName}" an!`,
          url,
        });
      } catch {
        // cancelled
      }
    } else {
      copyToClipboard(url, mode);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="h-4 w-4" />
          Teilen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Liste teilen
          </DialogTitle>
          <DialogDescription>
            Teile „{listName}" als Leseansicht oder zur gemeinsamen Bearbeitung.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="edit" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="edit" className="flex-1 gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              Bearbeiten
            </TabsTrigger>
            <TabsTrigger value="view" className="flex-1 gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              Nur ansehen
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="space-y-3 mt-4">
            <div className="rounded-md bg-primary/10 border border-primary/20 px-3 py-2 text-sm text-primary">
              ✏️ Jeder mit diesem Link kann Artikel hinzufügen, abhaken und löschen.
            </div>
            {editUrl ? (
              <>
                <div className="grid gap-1.5">
                  <Label htmlFor="editUrl">Bearbeitungs-Link</Label>
                  <div className="flex gap-2">
                    <Input id="editUrl" value={editUrl} readOnly className="font-mono text-xs" />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(editUrl, "edit")}
                      className="shrink-0"
                    >
                      {copiedEdit ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button className="w-full" onClick={() => handleNativeShare(editUrl, "edit")}>
                  <Share2 className="h-4 w-4 mr-2" />
                  {navigator.share ? "Teilen" : copiedEdit ? "Kopiert!" : "Link kopieren"}
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Link wird generiert…</p>
            )}
          </TabsContent>

          <TabsContent value="view" className="space-y-3 mt-4">
            <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              👁️ Schreibgeschützt – Personen können die Liste nur ansehen.
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="viewUrl">Lese-Link</Label>
              <div className="flex gap-2">
                <Input id="viewUrl" value={viewUrl} readOnly className="font-mono text-xs" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(viewUrl, "view")}
                  className="shrink-0"
                >
                  {copiedView ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={() => handleNativeShare(viewUrl, "view")}>
              <Share2 className="h-4 w-4 mr-2" />
              {navigator.share ? "Teilen" : copiedView ? "Kopiert!" : "Link kopieren"}
            </Button>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="w-full">
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareListDialog;
