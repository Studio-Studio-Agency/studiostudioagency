import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Camera, ArrowRight, ArrowLeft, Check, Calendar, Share2, Sparkles,
  Copy, ExternalLink, Loader2,
} from "lucide-react";
import { AppleCalendarIcon, GoogleCalendarIcon, OutlookCalendarIcon } from "@/components/CalendarIcons";
import goodgoodsLogo from "@/assets/goodgoods-logo.svg";
import goodgoodsLogoDark from "@/assets/goodgoods-logo-dark.svg";

const STEPS = [
  { id: "welcome", label: "Willkommen" },
  { id: "avatar", label: "Avatar" },
  { id: "calendar", label: "Kalender" },
  { id: "sharing", label: "Teilen" },
  { id: "done", label: "Fertig" },
];

const OnboardingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [vorname, setVorname] = useState("");
  const [calendarToken, setCalendarToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [profileRes, settingsRes] = await Promise.all([
        supabase.from("profiles").select("vorname, avatar_url").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_settings").select("calendar_token").eq("user_id", user.id).maybeSingle(),
      ]);
      if (profileRes.data) {
        setVorname(profileRes.data.vorname ?? "");
        setAvatarUrl(profileRes.data.avatar_url ?? null);
      }
      if (settingsRes.data) setCalendarToken(settingsRes.data.calendar_token ?? null);
    };
    load();
  }, [user]);

  const goTo = (next: number) => {
    setAnimating(true);
    setTimeout(() => {
      setStep(next);
      setTimeout(() => setAnimating(false), 50);
    }, 200);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Bitte wähle ein Bild", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
    if (error) {
      toast({ title: "Upload fehlgeschlagen", variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", user.id);
    setAvatarUrl(`${publicUrl}?t=${Date.now()}`);
    setUploading(false);
    toast({ title: "Avatar gespeichert! 🎉" });
  };

  const finishOnboarding = async () => {
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .upsert({ user_id: user.id, onboarding_completed: true }, { onConflict: "user_id" });

    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return;
    }

    navigate("/listen", { replace: true });
  };

  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const feedUrl = calendarToken ? `${baseUrl}/functions/v1/calendar-feed?token=${calendarToken}` : "";
  const webcalUrl = feedUrl.replace(/^https?:\/\//, "webcal://");
  const googleUrl = feedUrl ? `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}` : "";

  const copyLink = async () => {
    await navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    toast({ title: "Link kopiert! 📋" });
    setTimeout(() => setCopied(false), 2000);
  };

  const initials = vorname ? vorname.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() ?? "?";
  const progress = ((step) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="fixed top-4 left-0 right-0 z-40 flex justify-center gap-2">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === step ? "w-8 bg-primary" : i < step ? "w-2 bg-primary/60" : "w-2 bg-muted-foreground/20"
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div
          className={`w-full max-w-md transition-all duration-200 ${
            animating ? "opacity-0 translate-y-4 scale-95" : "opacity-100 translate-y-0 scale-100"
          }`}
        >
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="text-center space-y-8">
              <div className="animate-fade-in">
                <img src={goodgoodsLogo} alt="GoodGoods" className="h-12 w-auto mx-auto mb-6 dark:hidden" />
                <img src={goodgoodsLogoDark} alt="GoodGoods" className="h-12 w-auto mx-auto mb-6 hidden dark:block" />
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary mb-4">
                  <Sparkles className="h-4 w-4" /> Willkommen!
                </div>
                <h1 className="text-3xl font-bold tracking-tight mb-3">
                  Hallo{vorname ? `, ${vorname}` : ""}! 👋
                </h1>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Lass uns dein GoodGoods in<br />wenigen Schritten einrichten.
                </p>
              </div>
              <Button size="lg" className="w-full max-w-xs mx-auto text-base gap-2" onClick={() => goTo(1)}>
                Los geht's <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Step 1: Avatar */}
          {step === 1 && (
            <div className="text-center space-y-8">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary mb-4">
                  <Camera className="h-4 w-4" /> Schritt 1 von 3
                </div>
                <h2 className="text-2xl font-bold mb-2">Dein Profilbild</h2>
                <p className="text-muted-foreground">Zeig dich von deiner besten Seite ✨</p>
              </div>

              <div
                className="relative mx-auto w-36 h-36 cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <Avatar className="h-36 w-36 border-4 border-primary/20 shadow-xl shadow-primary/10">
                  <AvatarImage src={avatarUrl ?? undefined} alt="Avatar" className="object-cover" />
                  <AvatarFallback className="text-4xl bg-muted">{initials}</AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                  {uploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  ) : (
                    <Camera className="h-8 w-8 text-white" />
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-2 shadow-lg border-2 border-background">
                  <Camera className="h-4 w-4 text-primary-foreground" />
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                />
              </div>

              <p className="text-sm text-muted-foreground">
                {avatarUrl ? "Sieht gut aus! Du kannst es jederzeit ändern." : "Tippe auf den Kreis, um ein Foto hochzuladen."}
              </p>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => goTo(0)} className="flex-1 gap-1">
                  <ArrowLeft className="h-4 w-4" /> Zurück
                </Button>
                <Button onClick={() => goTo(2)} className="flex-1 gap-1">
                  {avatarUrl ? "Weiter" : "Überspringen"} <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Calendar */}
          {step === 2 && (
            <div className="text-center space-y-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary mb-4">
                  <Calendar className="h-4 w-4" /> Schritt 2 von 3
                </div>
                <h2 className="text-2xl font-bold mb-2">Kalender verbinden</h2>
                <p className="text-muted-foreground">Haltbarkeitsdaten direkt im Kalender sehen 📅</p>
              </div>

              {calendarToken && (
                <div className="space-y-3">
                  <a
                    href={webcalUrl}
                    className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-accent transition-colors"
                  >
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <AppleCalendarIcon className="h-6 w-6" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-medium text-sm">Apple Kalender</p>
                      <p className="text-xs text-muted-foreground">iPhone, iPad & Mac</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </a>

                  <a
                    href={googleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-accent transition-colors"
                  >
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <GoogleCalendarIcon className="h-6 w-6" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-medium text-sm">Google Kalender</p>
                      <p className="text-xs text-muted-foreground">Android & Web</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </a>

                  <button
                    onClick={copyLink}
                    className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-accent transition-colors w-full"
                  >
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <OutlookCalendarIcon className="h-6 w-6" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-medium text-sm">Outlook / Andere</p>
                      <p className="text-xs text-muted-foreground">Link kopieren & einfügen</p>
                    </div>
                    {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </div>
              )}

              {!calendarToken && (
                <div className="p-6 rounded-xl border bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    Kalender-Token wird automatisch generiert. Du kannst das später in den Einstellungen konfigurieren.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="ghost" onClick={() => goTo(1)} className="flex-1 gap-1">
                  <ArrowLeft className="h-4 w-4" /> Zurück
                </Button>
                <Button onClick={() => goTo(3)} className="flex-1 gap-1">
                  Weiter <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Sharing */}
          {step === 3 && (
            <div className="text-center space-y-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary mb-4">
                  <Share2 className="h-4 w-4" /> Schritt 3 von 3
                </div>
                <h2 className="text-2xl font-bold mb-2">Listen teilen</h2>
                <p className="text-muted-foreground">Gemeinsam einkaufen, einfach gemacht 🛒</p>
              </div>

              <div className="space-y-4 text-left">
                <div className="flex gap-4 items-start p-4 rounded-xl border bg-card">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-lg">1️⃣</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Liste öffnen</p>
                    <p className="text-xs text-muted-foreground">Gehe zu einer deiner Einkaufslisten</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start p-4 rounded-xl border bg-card">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-lg">2️⃣</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Teilen-Button drücken</p>
                    <p className="text-xs text-muted-foreground">Du findest ihn oben in der Liste</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start p-4 rounded-xl border bg-card">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-lg">3️⃣</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Link verschicken</p>
                    <p className="text-xs text-muted-foreground">Per WhatsApp, E-Mail oder einfach kopieren</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="ghost" onClick={() => goTo(2)} className="flex-1 gap-1">
                  <ArrowLeft className="h-4 w-4" /> Zurück
                </Button>
                <Button onClick={() => goTo(4)} className="flex-1 gap-1">
                  Weiter <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 4 && (
            <div className="text-center space-y-8">
              <div>
                <div className="text-6xl mb-6">🎉</div>
                <h2 className="text-3xl font-bold mb-3">Alles bereit!</h2>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Du bist startklar. Erstelle deine erste Einkaufsliste oder schau dich um.
                </p>
              </div>

              <div className="flex items-center justify-center gap-4 py-4">
                <Avatar className="h-16 w-16 border-2 border-primary/20 shadow-lg">
                  <AvatarImage src={avatarUrl ?? undefined} alt="Avatar" className="object-cover" />
                  <AvatarFallback className="text-xl bg-muted">{initials}</AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="font-semibold">{vorname || "Dein Profil"}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <Button
                size="lg"
                className="w-full max-w-xs mx-auto text-base gap-2"
                onClick={finishOnboarding}
              >
                <Check className="h-4 w-4" /> Zu meinen Listen
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Skip */}
      {step > 0 && step < 4 && (
        <div className="fixed bottom-6 left-0 right-0 text-center space-y-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/listen", { replace: true })} className="gap-1">
            Später fortfahren <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default OnboardingPage;
