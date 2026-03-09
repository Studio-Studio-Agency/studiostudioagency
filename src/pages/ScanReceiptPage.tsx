import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Camera, ImagePlus, Loader2, ScanLine, CheckCircle2, X, Pencil, Save } from "lucide-react";
import { KATEGORIEN } from "@/components/ListItemRow";

interface ScannedItem {
  name: string;
  menge: number | null;
  einheit: string | null;
  kategorie: string | null;
  istLebensmittel: boolean;
  haltbarkeitTage: number | null;
  erinnerungVorTagen: number | null;
  lagerhinweis: string | null;
  erklaerung: string | null;
}

const ScanReceiptPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [listName, setListName] = useState("");
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [savedResult, setSavedResult] = useState<{ listId: string; listName: string } | null>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Fehler", description: "Bitte ein Bild auswählen.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Fehler", description: "Bild darf max. 10 MB gross sein.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      setImageBase64(dataUrl.split(",")[1]);
      setItems([]);
      setSavedResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!imageBase64) return;
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("scan-receipt", {
        body: { action: "analyze", imageBase64 },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: "Fehler", description: data.message || "Analyse fehlgeschlagen.", variant: "destructive" });
        return;
      }
      if (data?.success && data.items) {
        setItems(data.items);
        toast({ title: `${data.items.length} Artikel erkannt ✅` });
      }
    } catch (err: any) {
      console.error("Scan error:", err);
      toast({ title: "Fehler", description: "Analyse fehlgeschlagen. Bitte erneut versuchen.", variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  const handleSave = async () => {
    if (items.length === 0) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("scan-receipt", {
        body: { action: "save", listName: listName.trim() || undefined, items },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: "Fehler", description: data.message, variant: "destructive" });
        return;
      }
      if (data?.success) {
        setSavedResult({ listId: data.listId, listName: data.listName });
        toast({ title: `${data.itemCount} Artikel gespeichert ✅`, description: `Liste „${data.listName}" erstellt.` });
      }
    } catch (err: any) {
      console.error("Save error:", err);
      toast({ title: "Fehler", description: "Speichern fehlgeschlagen.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
    if (editingIdx === idx) setEditingIdx(null);
  };

  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditName(items[idx].name);
  };

  const saveEdit = (idx: number) => {
    if (!editName.trim()) return;
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, name: editName.trim() } : item));
    setEditingIdx(null);
  };

  const getLifecycleDot = (item: ScannedItem) => {
    if (!item.haltbarkeitTage) return "🟢";
    if (item.haltbarkeitTage <= 2) return "🟠";
    if (item.haltbarkeitTage <= 5) return "🟡";
    return "🟢";
  };

  const resetAll = () => {
    setImagePreview(null);
    setImageBase64(null);
    setListName("");
    setItems([]);
    setSavedResult(null);
    setEditingIdx(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <main className="container py-6 max-w-2xl">
        <button
          onClick={() => navigate("/listen")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Zurück
        </button>

        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <ScanLine className="h-6 w-6 text-primary" />
          Einkaufszettel scannen
        </h1>

        {/* SAVED STATE */}
        {savedResult ? (
          <div className="space-y-4 animate-fade-in">
            <Card className="p-4 bg-primary/10 border-primary/20">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                <div>
                  <p className="font-medium">
                    {items.length} Artikel in „{savedResult.listName}" gespeichert
                  </p>
                  <p className="text-sm text-muted-foreground">Alle Produkte wurden analysiert</p>
                </div>
              </div>
            </Card>
            <div className="flex gap-3">
              <Button onClick={() => navigate(`/listen/${savedResult.listId}`)} className="flex-1">
                Liste öffnen
              </Button>
              <Button variant="outline" onClick={resetAll} className="flex-1">
                Neuen Bon scannen
              </Button>
            </div>
          </div>
        ) : items.length === 0 ? (
          /* UPLOAD / SCAN STATE */
          <div className="space-y-6">
            {!imagePreview ? (
              <Card className="p-8 border-2 border-dashed border-border text-center space-y-4">
                <p className="text-muted-foreground">Fotografiere oder lade ein Bild deines Einkaufszettels hoch</p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <Button variant="outline" onClick={() => cameraInputRef.current?.click()} className="gap-2">
                    <Camera className="h-4 w-4" /> Foto aufnehmen
                  </Button>
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
                    <ImagePlus className="h-4 w-4" /> Bild wählen
                  </Button>
                </div>
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img src={imagePreview} alt="Einkaufszettel" className="w-full max-h-96 object-contain bg-muted" />
                  <Button variant="secondary" size="sm" className="absolute top-2 right-2"
                    onClick={() => { setImagePreview(null); setImageBase64(null); }}>
                    Ändern
                  </Button>
                </div>
                <Button onClick={handleAnalyze} disabled={scanning} className="w-full gap-2" size="lg">
                  {scanning ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /> KI analysiert Bon…</>
                  ) : (
                    <><ScanLine className="h-5 w-5" /> Jetzt scannen</>
                  )}
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* EDIT STATE - items recognized, not yet saved */
          <div className="space-y-4 animate-fade-in">
            <Card className="p-4 bg-accent/50 border-accent">
              <p className="font-medium text-sm">
                {items.length} Artikel erkannt – bearbeite oder entferne Artikel, bevor du speicherst.
              </p>
            </Card>

            <Input
              placeholder="Listenname (optional)"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
            />

            <div className="space-y-2">
              {items.map((item, idx) => {
                const ablaufDatum = item.haltbarkeitTage && item.istLebensmittel
                  ? (() => { const d = new Date(); d.setDate(d.getDate() + item.haltbarkeitTage); return d.toLocaleDateString("de-CH"); })()
                  : null;

                return (
                  <Card key={idx} className="p-3">
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 text-lg mt-0.5">{getLifecycleDot(item)}</span>
                      <div className="flex-1 min-w-0">
                        {editingIdx === idx ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && saveEdit(idx)}
                              className="h-8 text-sm"
                              autoFocus
                            />
                            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => saveEdit(idx)}>
                              <Save className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{item.name}</span>
                            {item.menge && (
                              <span className="text-sm text-muted-foreground">
                                {item.menge} {item.einheit}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="mt-1.5 p-2 rounded-md bg-accent text-sm space-y-1">
                          {item.kategorie && (
                            <div className="flex items-center gap-2">
                              <span>{KATEGORIEN[item.kategorie] || "📦"}</span>
                              <span className="font-medium text-accent-foreground">{item.kategorie}</span>
                            </div>
                          )}
                          {ablaufDatum && (
                            <p className="text-muted-foreground">
                              Haltbar bis: <span className="text-foreground">{ablaufDatum}</span>
                            </p>
                          )}
                          {item.haltbarkeitTage && (
                            <p className="text-muted-foreground">⏱ ca. {item.haltbarkeitTage} Tage haltbar</p>
                          )}
                          {item.lagerhinweis && (
                            <p className="text-muted-foreground">💡 {item.lagerhinweis}</p>
                          )}
                          {item.erklaerung && (
                            <p className="text-muted-foreground">{item.erklaerung}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-0.5 shrink-0">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(idx)} title="Bearbeiten">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeItem(idx)} title="Entfernen">
                          <X className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving || items.length === 0} className="flex-1 gap-2">
                {saving ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Speichern…</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4" /> {items.length} Artikel speichern</>
                )}
              </Button>
              <Button variant="outline" onClick={resetAll} className="flex-1">
                Abbrechen
              </Button>
            </div>
          </div>
        )}
      </main>
      <div className="mt-auto">
        <AppFooter />
      </div>
    </div>
  );
};

export default ScanReceiptPage;
