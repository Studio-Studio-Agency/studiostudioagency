import { useEffect, useRef, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Snowflake, RotateCcw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useKlimaChat } from "@/lib/klima/useKlimaChat";
import { SEGMENTS } from "@/lib/klima/qualification";

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-2" aria-label="Berater tippt">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

export default function KlimaChat({ className }: { className?: string }) {
  const { messages, loading, error, state, send, reset } = useKlimaChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    void send(text);
  };

  const segmentLabel = state.segment ? SEGMENTS[state.segment].label : null;
  const pct = Math.round(state.completion * 100);

  return (
    <div
      className={cn(
        "flex h-[600px] max-h-[80vh] w-full flex-col overflow-hidden rounded-2xl border bg-card shadow-lg",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b bg-gradient-to-r from-sky-600 to-cyan-500 px-4 py-3 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
            <Snowflake className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Klimapartner Basel</p>
            <p className="text-xs text-white/80 leading-tight">Ihr Klima-Berater · online</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {segmentLabel && (
            <Badge variant="secondary" className="hidden sm:inline-flex bg-white/20 text-white hover:bg-white/30 border-0">
              {state.segment}
            </Badge>
          )}
          <button
            onClick={reset}
            title="Neues Gespräch"
            className="rounded-full p-1.5 transition-colors hover:bg-white/20"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Qualification progress */}
      {state.segment && (
        <div className="border-b bg-muted/40 px-4 py-2">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>{state.qualified ? "Anfrage bereit für Partner" : "Bedarf wird erfasst"}</span>
            <span>{pct}%</span>
          </div>
          <Progress value={pct} className="h-1.5" />
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                m.role === "user"
                  ? "rounded-br-sm bg-sky-600 text-white"
                  : "rounded-bl-sm bg-muted text-foreground",
              )}
            >
              {m.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                </div>
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}
        {loading &&
          (messages.length === 0 || messages[messages.length - 1].role === "user") && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm bg-muted px-4">
                <TypingDots />
              </div>
            </div>
          )}
        {state.qualified && !loading && (
          <div className="flex items-center justify-center gap-2 pt-2 text-xs text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            <span>Ihre Anfrage wurde erfasst — ein Partner meldet sich.</span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="border-t bg-destructive/10 px-4 py-2 text-xs text-destructive">{error}</div>
      )}

      {/* Composer */}
      <form onSubmit={onSubmit} className="flex items-center gap-2 border-t bg-background px-3 py-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ihre Nachricht…"
          className="flex-1"
          disabled={loading}
          aria-label="Nachricht"
        />
        <Button type="submit" size="icon" disabled={loading || !input.trim()} className="shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
