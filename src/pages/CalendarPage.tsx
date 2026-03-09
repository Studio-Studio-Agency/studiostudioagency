import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Copy, RefreshCw, Check, Calendar, Download, ExternalLink, Smartphone, ChevronDown, ChevronUp, Link2 } from "lucide-react";
import { AppleCalendarIcon, GoogleCalendarIcon, OutlookCalendarIcon } from "@/components/CalendarIcons";

const CalendarPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [calendarToken, setCalendarToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showManual, setShowManual] = useState(false);

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

  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const feedUrl = calendarToken
    ? `${baseUrl}/functions/v1/calendar-feed?token=${calendarToken}`
    : "";
  const webcalUrl = feedUrl.replace(/^https?:\/\//, "webcal://");
  const mobileconfigUrl = feedUrl ? `${feedUrl}&format=mobileconfig` : "";
  const googleUrl = feedUrl
    ? `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`
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
          <Calendar className="h-6 w-6 text-primary" /> Haltbarkeits-Kalender
        </h1>
        <p className="text-muted-foreground mb-6">
          Verbinde FreshFresh AI mit deinem Kalender – ein Klick genügt.
        </p>

        {loading ? (
          <div className="space-y-3">
            <div className="h-24 bg-muted animate-pulse rounded-xl" />
            <div className="h-24 bg-muted animate-pulse rounded-xl" />
            <div className="h-24 bg-muted animate-pulse rounded-xl" />
          </div>
        ) : (
          <div className="space-y-3">
            {/* ── Apple Profil (empfohlen) ── */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="py-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <AppleCalendarIcon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm flex items-center gap-1.5">
                    Apple Kalender
                    <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-medium">Empfohlen</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Profil herunterladen → öffnen → fertig. Kein Tippen nötig.
                  </p>
                </div>
                <Button
                  size="sm"
                  asChild
                  className="shrink-0"
                >
                  <a href={mobileconfigUrl} download="freshfresh-kalender.mobileconfig">
                    <Download className="h-4 w-4 mr-1.5" />
                    Profil laden
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* ── webcal:// (iPhone / Mac, ohne Profil) ── */}
            <Card>
              <CardContent className="py-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <AppleCalendarIcon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">iPhone / iPad / Mac</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Direkt in Kalender öffnen – ohne Profil.
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild className="shrink-0">
                  <a href={webcalUrl}>
                    <ExternalLink className="h-4 w-4 mr-1.5" />
                    Öffnen
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* ── Google Calendar ── */}
            <Card>
              <CardContent className="py-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <GoogleCalendarIcon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">Google Calendar</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Direkt zur Abo-Seite von Google Calendar.
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild className="shrink-0">
                  <a href={googleUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1.5" />
                    Öffnen
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* ── Manueller Link ── */}
            <Card>
              <CardContent className="py-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <OutlookCalendarIcon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">Outlook / Andere</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Link manuell in jede Kalender-App einfügen.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={copyLink} className="shrink-0">
                  {copied ? <Check className="h-4 w-4 mr-1.5 text-primary" /> : <Copy className="h-4 w-4 mr-1.5" />}
                  {copied ? "Kopiert" : "Kopieren"}
                </Button>
              </CardContent>
            </Card>

            {/* ── Token erneuern ── */}
            <div className="flex justify-end pt-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={regenerateToken}
                disabled={regenerating}
                className="text-xs text-muted-foreground"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${regenerating ? "animate-spin" : ""}`} />
                Token erneuern (invalidiert alte Links)
              </Button>
            </div>

            {/* ── Schritt-für-Schritt (einklappbar) ── */}
            <button
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors pt-2"
              onClick={() => setShowManual(!showManual)}
            >
              {showManual ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              Manuelle Anleitung anzeigen
            </button>

            {showManual && (
              <div className="space-y-3 pt-1">
                <InstructionCard
                  icon={<AppleCalendarIcon className="h-5 w-5" />}
                  title="Apple Kalender (iPhone / Mac)"
                  steps={[
                    "Einstellungen → Kalender → Accounts → Account hinzufügen",
                    '„Andere" → „Kalenderabo hinzufügen"',
                    "Deinen Link einfügen → Hinzufügen",
                  ]}
                />
                <InstructionCard
                  icon={<GoogleCalendarIcon className="h-5 w-5" />}
                  title="Google Calendar"
                  steps={[
                    "calendar.google.com → Andere Kalender → Per URL",
                    "Deinen Link einfügen → Kalender hinzufügen",
                  ]}
                />
                <InstructionCard
                  icon={<OutlookCalendarIcon className="h-5 w-5" />}
                  title="Outlook"
                  steps={[
                    "Kalender → Kalender hinzufügen → Aus dem Internet abonnieren",
                    "Deinen Link einfügen → Importieren",
                  ]}
                />
              </div>
            )}

            <Card className="bg-accent mt-2">
              <CardContent className="py-3 text-center text-xs text-muted-foreground">
                ✅ Einmal verbunden – automatisch aktualisiert. Neue Artikel erscheinen automatisch.
              </CardContent>
            </Card>
          </div>
        )}
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
      <h3 className="font-medium mb-2 text-sm">
        {emoji} {title}
      </h3>
      <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
        {steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </CardContent>
  </Card>
);

export default CalendarPage;
