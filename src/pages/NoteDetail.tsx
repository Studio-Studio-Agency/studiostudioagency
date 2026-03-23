import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Sparkles, Loader2, CheckCircle2, ShoppingCart, ClipboardList, Eye, Pencil } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AnalysisResult {
  todos: { title: string; priority: string }[];
  summary: { text: string; priorities: { point: string; urgency: string }[] };
  shopping: { name: string; menge?: string }[];
}

const NoteDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [tab, setTab] = useState("edit");
  const saveTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      const { data, error } = await (supabase.from("notes") as any)
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        toast({ title: "Notiz nicht gefunden", variant: "destructive" });
        navigate("/notizen");
        return;
      }
      setTitle(data.title);
      setContent(data.content || "");
      setLoading(false);
    })();
  }, [id, user]);

  const save = useCallback(async (newContent: string) => {
    if (!id) return;
    setSaving(true);
    await (supabase.from("notes") as any).update({ content: newContent }).eq("id", id);
    setSaving(false);
  }, [id]);

  const handleContentChange = (value: string) => {
    setContent(value);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => save(value), 800);
  };

  const analyzeNote = async () => {
    if (!content.trim()) {
      toast({ title: "Notiz ist leer", description: "Schreibe zuerst etwas, bevor du die KI startest." });
      return;
    }
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-note", {
        body: { content, mode: "all" },
      });
      if (error) throw error;
      setAnalysis(data);
      setTab("analysis");
    } catch (e: any) {
      toast({ title: "Analyse fehlgeschlagen", description: e.message, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const priorityColor: Record<string, string> = {
    hoch: "bg-destructive text-destructive-foreground",
    mittel: "bg-primary text-primary-foreground",
    niedrig: "bg-muted text-muted-foreground",
  };

  const urgencyEmoji: Record<string, string> = {
    dringend: "🔴",
    wichtig: "🟡",
    "kann warten": "🟢",
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="flex-1 container py-6 max-w-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/notizen")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold flex-1 truncate">{title}</h1>
          {saving && <span className="text-xs text-muted-foreground">Speichern…</span>}
          <Button onClick={analyzeNote} disabled={analyzing} size="sm" variant="outline">
            {analyzing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
            KI analysieren
          </Button>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="edit"><Pencil className="h-3.5 w-3.5 mr-1" /> Bearbeiten</TabsTrigger>
            <TabsTrigger value="preview"><Eye className="h-3.5 w-3.5 mr-1" /> Vorschau</TabsTrigger>
            {analysis && (
              <TabsTrigger value="analysis"><Sparkles className="h-3.5 w-3.5 mr-1" /> KI-Ergebnis</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="edit">
            <Textarea
              value={content}
              onChange={e => handleContentChange(e.target.value)}
              placeholder={"# Meine Notiz\n\n- Punkt 1\n- Punkt 2\n- Milch kaufen\n\nMarkdown wird unterstützt!"}
              className="min-h-[400px] font-mono text-sm resize-y"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Markdown unterstützt: **fett**, *kursiv*, - Listen, # Überschriften, [x] Checkboxen
            </p>
          </TabsContent>

          <TabsContent value="preview">
            <div className="prose prose-sm dark:prose-invert max-w-none p-4 rounded-md border border-border bg-card min-h-[400px]">
              {content ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              ) : (
                <p className="text-muted-foreground italic">Noch kein Inhalt…</p>
              )}
            </div>
          </TabsContent>

          {analysis && (
            <TabsContent value="analysis">
              <div className="space-y-6">
                {/* To-Dos */}
                {analysis.todos.length > 0 && (
                  <div>
                    <h3 className="font-semibold flex items-center gap-2 mb-3">
                      <CheckCircle2 className="h-4 w-4 text-primary" /> Erkannte Aufgaben
                    </h3>
                    <div className="space-y-2">
                      {analysis.todos.map((todo, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-md bg-card border border-border">
                          <Badge className={priorityColor[todo.priority] || ""}>{todo.priority}</Badge>
                          <span className="text-sm">{todo.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Summary */}
                {analysis.summary?.text && (
                  <div>
                    <h3 className="font-semibold flex items-center gap-2 mb-3">
                      <ClipboardList className="h-4 w-4 text-primary" /> Zusammenfassung
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">{analysis.summary.text}</p>
                    {analysis.summary.priorities.length > 0 && (
                      <div className="space-y-1">
                        {analysis.summary.priorities.map((p, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <span>{urgencyEmoji[p.urgency] || "⚪"}</span>
                            <span>{p.point}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Shopping */}
                {analysis.shopping.length > 0 && (
                  <div>
                    <h3 className="font-semibold flex items-center gap-2 mb-3">
                      <ShoppingCart className="h-4 w-4 text-primary" /> Erkannte Einkaufsartikel
                    </h3>
                    <div className="space-y-1">
                      {analysis.shopping.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm p-1.5 rounded bg-accent">
                          <span>🛒</span>
                          <span>{item.name}</span>
                          {item.menge && <span className="text-muted-foreground ml-auto">{item.menge}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.todos.length === 0 && analysis.shopping.length === 0 && !analysis.summary?.text && (
                  <p className="text-muted-foreground text-center py-8">
                    Die KI konnte keine Aufgaben, Zusammenfassungen oder Einkaufsartikel erkennen.
                  </p>
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </main>
      <AppFooter />
    </div>
  );
};

export default NoteDetail;
