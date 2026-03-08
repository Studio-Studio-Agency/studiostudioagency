import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Share2, Copy, Check, Link } from "lucide-react";

interface ShareListDialogProps {
  listId: string;
  listName: string;
}

const ShareListDialog = ({ listId, listName }: ShareListDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/listen/${listId}`;
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: "Link kopiert!", description: "Der Link wurde in die Zwischenablage kopiert." });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({ title: "Fehler", description: "Link konnte nicht kopiert werden.", variant: "destructive" });
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Einkaufsliste: ${listName}`,
          text: `Schau dir meine Einkaufsliste "${listName}" an!`,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      handleCopyLink(); // Fallback
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Liste teilen
          </DialogTitle>
          <DialogDescription>
            Teilen Sie "{listName}" mit Familie oder Freunden.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="shareUrl">Link zur Liste</Label>
            <div className="flex gap-2">
              <Input
                id="shareUrl"
                value={shareUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button 
                type="button" 
                variant="outline" 
                size="icon"
                onClick={handleCopyLink}
                className="shrink-0"
              >
                {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="flex items-center gap-1">
              <Link className="h-3 w-3" />
              Mit diesem Link können andere Ihre Liste einsehen
            </p>
            <p>💡 Hinweis: Die geteilte Liste ist schreibgeschützt</p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Schließen
          </Button>
          {navigator.share ? (
            <Button onClick={handleNativeShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Teilen
            </Button>
          ) : (
            <Button onClick={handleCopyLink}>
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Kopiert!" : "Link kopieren"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareListDialog;