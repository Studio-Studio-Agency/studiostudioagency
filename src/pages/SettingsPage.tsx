import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, User, Bell, LogOut, Camera } from "lucide-react";

const SettingsPage = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [vorname, setVorname] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [emailNotifications, setEmailNotifications] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const [profileRes, settingsRes] = await Promise.all([
        supabase.from("profiles").select("vorname, avatar_url").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_settings").select("email_notifications").eq("user_id", user.id).maybeSingle(),
      ]);
      if (profileRes.data) {
        setVorname(profileRes.data.vorname ?? "");
        setAvatarUrl(profileRes.data.avatar_url ?? null);
      }
      if (settingsRes.data) {
        setEmailNotifications(settingsRes.data.email_notifications ?? false);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

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
      }, { onConflict: "user_id" }),
    ]);
    setSaving(false);
    if (profileRes.error || settingsRes.error) {
      toast({ title: "Fehler", description: "Einstellungen konnten nicht gespeichert werden.", variant: "destructive" });
    } else {
      toast({ title: "Gespeichert", description: "Deine Einstellungen wurden aktualisiert." });
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
              <button
                type="button"
                className="relative group cursor-pointer bg-transparent border-0 p-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Avatar className="h-24 w-24 border-2 border-border">
                  <AvatarImage src={avatarUrl ?? undefined} alt="Avatar" className="object-cover" />
                  <AvatarFallback className="text-2xl bg-muted">{initials}</AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  ) : (
                    <Camera className="h-6 w-6 text-white" />
                  )}
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  handleAvatarUpload(e);
                  e.target.value = "";
                }}
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground">Klicke um dein Foto zu ändern</p>
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
