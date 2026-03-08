import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Copy, RefreshCw, Check, Calendar } from "lucide-react";

const CalendarPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [calendarToken, setCalendarToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const fetchToken = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_settings")
      .select("calendar_token")
      .eq("user_id", user.id)
      .single();

    setCalendarToken(data?.calendar_token || null);
    setLoading(false);
  };

  useEffect(() => {
    fetchToken();
  }, [user]);

  const feedUrl = calendarToken
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-feed?token=${calendarToken}`
    : "";

  const copyLink = async () => {
    await navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    toast({ title: "Link kopiert! 📋" });
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerateToken = async () => {
    if (!user) return;
    setRegenerating(true);
    const newToken = crypto.randomUUID();
    const { error } = await supabase
      .from("user_settings")
      .update({ calendar_token: newToken })
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      setCalendarToken(newToken);
      toast({ title: "Neuer Token generiert ✅", description: "Der alte Link funktioniert nicht mehr." });
    }
    setRegenerating(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 max-w-2xl">
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Calendar className="h-6 w-6 text-primary" /> Dein Haltbarkeits-Kalender
        </h1>
        <p className="text-muted-foreground mb-6">
          Verbinde FreshFresh AI mit deinem Kalender. Du bekommst automatisch Erinnerungen wenn deine Lebensmittel bald ablaufen.
        </p>

        {/* Feed URL */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Dein persönlicher Kalender-Link</CardTitle>
            <CardDescription>Teile diesen Link nicht – er gibt Zugriff auf deine Haltbarkeitsdaten.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="h-10 bg-muted animate-pulse rounded-md" />
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={feedUrl}
                    className="flex-1 rounded-md border bg-muted px-3 py-2 text-xs font-mono truncate"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <Button size="sm" onClick={copyLink} variant="outline">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={regenerateToken}
                  disabled={regenerating}
                  className="text-xs"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${regenerating ? "animate-spin" : ""}`} />
                  Token erneuern
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <div className="space-y-4">
          <InstructionCard
            emoji="📱"
            title="Apple Kalender (iPhone / Mac)"
            steps={[
              "Einstellungen → Kalender → Accounts → Account hinzufügen",
              '„Andere" → „Kalenderabo hinzufügen"',
              "Deinen Link einfügen → Hinzufügen",
            ]}
          />
          <InstructionCard
            emoji="📅"
            title="Google Calendar"
            steps={[
              "calendar.google.com → Andere Kalender → Per URL",
              "Deinen Link einfügen → Kalender hinzufügen",
            ]}
          />
          <InstructionCard
            emoji="📧"
            title="Outlook"
            steps={[
              "Kalender → Kalender hinzufügen → Aus dem Internet abonnieren",
              "Deinen Link einfügen → Importieren",
            ]}
          />
        </div>

        <Card className="mt-6 bg-accent">
          <CardContent className="py-4 text-center text-sm text-muted-foreground">
            ✅ Einmal verbunden – automatisch aktualisiert.<br />
            Kein Login, kein Aufwand. Neue Artikel erscheinen automatisch.
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

const InstructionCard = ({
  emoji,
  title,
  steps,
}: {
  emoji: string;
  title: string;
  steps: string[];
}) => (
  <Card>
    <CardContent className="py-4">
      <h3 className="font-medium mb-2">
        {emoji} {title}
      </h3>
      <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
        {steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </CardContent>
  </Card>
);

export default CalendarPage;
