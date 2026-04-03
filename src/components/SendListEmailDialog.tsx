import { useState } from "react";
import { Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { generateListPdfBlob } from "@/lib/generateListPdf";
import type { Item } from "@/components/ListItemRow";

interface SendListEmailDialogProps {
  listName: string;
  listId: string;
  items: Item[];
  senderName?: string;
}

const SendListEmailDialog = ({ listName, listId, items, senderName }: SendListEmailDialogProps) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!email.trim()) return;
    setSending(true);

    try {
      // Generate PDF blob
      const blob = generateListPdfBlob(listName, items);
      const fileName = `${listId}/${Date.now()}.pdf`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("list-exports")
        .upload(fileName, blob, { contentType: "application/pdf" });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("list-exports")
        .getPublicUrl(fileName);

      // Send email
      const { error: emailError } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "list-share",
          recipientEmail: email.trim(),
          idempotencyKey: `list-share-${listId}-${Date.now()}`,
          templateData: {
            senderName: senderName || undefined,
            listName,
            itemCount: items.length,
            downloadUrl: urlData.publicUrl,
          },
        },
      });

      if (emailError) throw emailError;

      toast({ title: "E-Mail gesendet", description: `Liste wurde an ${email} gesendet.` });
      setEmail("");
      setOpen(false);
    } catch (err: any) {
      console.error("Send list email error:", err);
      toast({ title: "Fehler", description: err.message || "E-Mail konnte nicht gesendet werden.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Per E-Mail senden">
          <Mail className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Liste per E-Mail senden</DialogTitle>
          <DialogDescription>
            Die Liste «{listName}» wird als PDF an die angegebene E-Mail-Adresse gesendet.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-2">
          <Input
            type="email"
            placeholder="empfaenger@beispiel.de"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={sending}
          />
          <Button onClick={handleSend} disabled={sending || !email.trim()} className="w-full">
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
            Senden
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SendListEmailDialog;
