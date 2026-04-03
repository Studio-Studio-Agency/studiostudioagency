import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import CameraCapture from "@/components/CameraCapture";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, User, Bell, LogOut, Camera, ImagePlus, Webhook, Copy, RefreshCw, Eye, EyeOff, Sun, Moon, Monitor, Trash2, Wallet } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CategoryOrderSettings from "@/components/CategoryOrderSettings";
import { useTheme } from "next-themes";

const SettingsPage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [vorname, setVorname] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [webhookToken, setWebhookToken] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [autoDeleteDays, setAutoDeleteDays] = useState<string>("none");
  const [monthlyBudget, setMonthlyBudget] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const [profileRes, settingsRes] = await Promise.all([
        supabase.from("profiles").select("vorname, avatar_url").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_settings").select("email_notifications, webhook_token, auto_delete_days").eq("user_id", user.id).maybeSingle(),
      ]);
      if (profileRes.data) {
        setVorname(profileRes.data.vorname ?? "");
        setAvatarUrl(profileRes.data.avatar_url ?? null);
      }
      if (settingsRes.data) {
        setEmailNotifications(settingsRes.data.email_notifications ?? false);
        setWebhookToken((settingsRes.data as any).webhook_token ?? null);
        const days = (settingsRes.data as any).auto_delete_days;
        setAutoDeleteDays(days ? String(days) : "none");
        const budget = (settingsRes.data as any).monthly_budget;
        setMonthlyBudget(budget != null ? String(budget) : "");
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const uploadAvatarFile = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Fehler", description: "Bitte wähle eine Bilddatei.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Fehler", description: "Das Bild darf max. 5 MB groß sein.", variant: "destructive" });
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Upload fehlgeschlagen", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    setUploading(false);
    if (updateError) {
      toast({ title: "Fehler", description: "Avatar konnte nicht gespeichert werden.", variant: "destructive" });
    } else {
      setAvatarUrl(urlWithCacheBust);
      toast({ title: "Avatar aktualisiert" });
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const [profileRes, settingsRes] = await Promise.all([
      supabase.from("profiles").upsert({ user_id: user.id, vorname, updated_at: new Date().toISOString() }, { onConflict: "user_id" }),
      supabase.from("user_settings").upsert({
        user_id: user.id,
        email_notifications: emailNotifications,
        auto_delete_days: autoDeleteDays === "none" ? null : parseInt(autoDeleteDays),
        monthly_budget: monthlyBudget ? parseFloat(monthlyBudget) : null,
      } as any, { onConflict: "user_id" }),
    ]);
    setSaving(false);
    if (profileRes.error || settingsRes.error) {
      toast({ title: "Fehler", description: "Einstellungen konnten nicht gespeichert werden.", variant: "destructive" });
    } else {
      toast({ title: "Gespeichert", description: "Deine Einstellungen wurden aktualisiert." });
      navigate("/listen");
    }
  };

  const initials = vorname ? vorname.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() ?? "?";

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <main className="container max-w-lg py-8 space-y-6">
        <h1 className="text-2xl font-bold">Einstellungen</h1>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-4 w-4" /> Profil
            </CardTitle>
            <CardDescription>Deine persönlichen Daten</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <Avatar className="h-24 w-24 border-2 border-border">
                <AvatarImage src={avatarUrl ?? undefined} alt="Avatar" className="object-cover" />
                <AvatarFallback className="text-2xl bg-muted">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setCameraOpen(true)}
                  disabled={uploading}
                >
                  <Camera className="h-4 w-4" /> Foto aufnehmen
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <ImagePlus className="h-4 w-4" /> Hochladen
                </Button>
              </div>
              {uploading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadAvatarFile(file);
                  e.target.value = "";
                }}
                disabled={uploading}
              />
              <CameraCapture
                open={cameraOpen}
                onClose={() => setCameraOpen(false)}
                onCapture={(file) => uploadAvatarFile(file)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input id="email" value={user?.email ?? ""} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vorname">Vorname</Label>
              <Input id="vorname" value={vorname} onChange={(e) => setVorname(e.target.value)} placeholder="Dein Vorname" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-4 w-4" /> Benachrichtigungen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="email-notifications">E-Mail-Benachrichtigungen</Label>
              <Switch id="email-notifications" checked={emailNotifications} onCheckedChange={setEmailNotifications} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sun className="h-4 w-4" /> Erscheinungsbild
            </CardTitle>
            <CardDescription>Wähle dein bevorzugtes Farbschema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: "light", label: "Hell", icon: Sun },
                { value: "dark", label: "Dunkel", icon: Moon },
                { value: "system", label: "System", icon: Monitor },
              ] as const).map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-colors ${
                    theme === value
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs">{label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Webhook className="h-4 w-4" /> Webhook-API
            </CardTitle>
            <CardDescription>
              Füge per HTTP-Request Artikel hinzu – z.B. via Alexa, Siri Shortcuts oder Home Assistant.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Webhook-URL</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-add-item`}
                  className="bg-muted text-xs font-mono"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-add-item`);
                    toast({ title: "URL kopiert" });
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>API-Token</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={showToken ? (webhookToken ?? "–") : "••••••••••••••••"}
                  className="bg-muted text-xs font-mono"
                />
                <Button variant="outline" size="icon" onClick={() => setShowToken(!showToken)}>
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (webhookToken) {
                      navigator.clipboard.writeText(webhookToken);
                      toast({ title: "Token kopiert" });
                    }
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={regenerating}
                  onClick={async () => {
                    if (!user) return;
                    setRegenerating(true);
                    const newToken = crypto.randomUUID();
                    const { error } = await supabase
                      .from("user_settings")
                      .update({ webhook_token: newToken } as any)
                      .eq("user_id", user.id);
                    setRegenerating(false);
                    if (error) {
                      toast({ title: "Fehler", description: "Token konnte nicht erneuert werden.", variant: "destructive" });
                    } else {
                      setWebhookToken(newToken);
                      toast({ title: "Neuer Token generiert" });
                    }
                  }}
                >
                  {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground space-y-3">
              <p className="font-medium text-foreground">Beispiel (cURL):</p>
              <pre className="whitespace-pre-wrap break-all">
{`curl -X POST \\
  ${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-add-item \\
  -H "Content-Type: application/json" \\
  -d '{"token":"DEIN_TOKEN", "items":"Milch, Brot, Eier"}'`}
              </pre>
              <p className="mt-2 font-medium text-foreground">Optionen:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><code className="text-foreground">"item": "Milch"</code> – Einzelner Artikel</li>
                <li><code className="text-foreground">"items": "Milch, Brot"</code> – Komma-getrennt</li>
                <li><code className="text-foreground">{'"items": [{"name":"Milch","menge":1,"einheit":"l"}]'}</code> – Mit Details</li>
                <li><code className="text-foreground">"list_name": "Wocheneinkauf"</code> – Ziel-Liste (Standard: Einkaufsliste)</li>
              </ul>
            </div>

            <div className="rounded-md border border-border p-3 text-xs text-muted-foreground space-y-3">
              <p className="font-semibold text-foreground">📱 Einrichtung mit Alexa</p>
              <ol className="list-decimal list-inside space-y-1.5">
                <li>Öffne die <span className="font-medium text-foreground">Alexa-App</span> → „Mehr" → „Routinen"</li>
                <li>Erstelle eine neue Routine mit einem Sprachbefehl, z.B. <span className="italic">„Alexa, füge Milch zur Einkaufsliste hinzu"</span></li>
                <li>Füge als Aktion <span className="font-medium text-foreground">„Skill-Aktion"</span> hinzu und wähle einen HTTP-Webhook-Skill (z.B. <span className="font-medium text-foreground">Voicemonkey</span> oder <span className="font-medium text-foreground">Virtual Buttons</span>)</li>
                <li>Konfiguriere den Skill mit der <span className="font-medium text-foreground">Webhook-URL</span> und deinem <span className="font-medium text-foreground">Token</span> von oben</li>
                <li>Sende als Body: <code className="text-foreground bg-background/50 px-1 rounded">{`{"token":"DEIN_TOKEN","item":"Milch"}`}</code></li>
              </ol>

              <p className="font-semibold text-foreground pt-1">🍎 Einrichtung mit Siri Shortcuts</p>
              <ol className="list-decimal list-inside space-y-1.5">
                <li>Öffne die <span className="font-medium text-foreground">Kurzbefehle-App</span> auf deinem iPhone/iPad</li>
                <li>Erstelle einen neuen Kurzbefehl → Aktion <span className="font-medium text-foreground">„URL-Inhalt abrufen"</span></li>
                <li>Methode: <span className="font-medium text-foreground">POST</span>, Body: JSON mit <code className="text-foreground bg-background/50 px-1 rounded">token</code> und <code className="text-foreground bg-background/50 px-1 rounded">item</code></li>
                <li>Füge <span className="font-medium text-foreground">„Nach Eingabe fragen"</span> hinzu, um den Artikelnamen per Sprache einzugeben</li>
                <li>Benenne den Kurzbefehl, z.B. <span className="italic">„Einkaufsliste"</span> – dann sagst du: <span className="italic">„Hey Siri, Einkaufsliste"</span></li>
              </ol>

              <p className="font-semibold text-foreground pt-1">🏠 Home Assistant</p>
              <p>Nutze die <code className="text-foreground bg-background/50 px-1 rounded">rest_command</code>-Integration mit der Webhook-URL und deinem Token als JSON-Body.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trash2 className="h-4 w-4" /> Auto-Löschung
            </CardTitle>
            <CardDescription>Erledigte Artikel nach einer bestimmten Zeit automatisch löschen</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={autoDeleteDays} onValueChange={setAutoDeleteDays}>
              <SelectTrigger>
                <SelectValue placeholder="Auswählen…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nie (manuell löschen)</SelectItem>
                <SelectItem value="3">Nach 3 Tagen</SelectItem>
                <SelectItem value="7">Nach 7 Tagen</SelectItem>
                <SelectItem value="14">Nach 14 Tagen</SelectItem>
                <SelectItem value="30">Nach 30 Tagen</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="h-4 w-4" /> Monatsbudget
            </CardTitle>
            <CardDescription>Warne mich, wenn meine monatlichen Ausgaben diesen Betrag überschreiten</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                step="10"
                placeholder="z.B. 500"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                className="max-w-[160px]"
              />
              <span className="text-sm text-muted-foreground">CHF</span>
            </div>
          </CardContent>
        </Card>

        <CategoryOrderSettings />

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Speichern
        </Button>

        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <Button variant="destructive" onClick={signOut} className="w-full">
              <LogOut className="h-4 w-4 mr-2" /> Abmelden
            </Button>
          </CardContent>
        </Card>
      </main>
      <div className="mt-auto">
        <AppFooter />
      </div>
    </div>
  );
};

export default SettingsPage;
