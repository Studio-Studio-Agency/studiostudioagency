import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Smartphone, Users, Send, Loader2 } from "lucide-react";

const IOSWaitlistDialog = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [waitlistCount, setWaitlistCount] = useState(0);

  useEffect(() => {
    const fetchWaitlistCount = async () => {
      const { data } = await supabase
        .from("ios_waitlist_stats")
        .select("total")
        .maybeSingle();
      setWaitlistCount(data?.total || 0);
    };
    fetchWaitlistCount();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    const { error } = await supabase.from("ios_waitlist").insert({
      email: email.trim().toLowerCase()
    });

    if (error) {
      if (error.code === '23505') { // unique violation
        toast({ 
          title: "Bereits registriert", 
          description: "Diese E-Mail ist bereits auf der Warteliste.",
          variant: "default"
        });
      } else {
        toast({ title: "Fehler", description: error.message, variant: "destructive" });
      }
    } else {
      toast({ 
        title: "Erfolgreich registriert!", 
        description: "Sie werden benachrichtigt, sobald die iOS App verfügbar ist." 
      });
      setEmail("");
      setOpen(false);
      setWaitlistCount(prev => prev + 1);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Smartphone className="h-4 w-4" />
          iOS App Warteliste
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            iOS App Warteliste
          </DialogTitle>
          <DialogDescription>
            Die iOS App ist in Entwicklung. Registrieren Sie sich für Early Access!
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center justify-center gap-2 py-4">
          <Badge variant="secondary" className="gap-1">
            <Users className="h-3 w-3" />
            {waitlistCount} bereits angemeldet
          </Badge>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">E-Mail Adresse</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ihre@email.com"
                required
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <p>✨ Sie erhalten:</p>
              <ul className="mt-1 list-disc list-inside space-y-1">
                <li>Frühzeitigen Zugang zur iOS App</li>
                <li>Exklusive Beta-Features</li>
                <li>Direkte Kommunikation mit den Entwicklern</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Später
            </Button>
            <Button type="submit" disabled={loading || !email.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Anmelden
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default IOSWaitlistDialog;