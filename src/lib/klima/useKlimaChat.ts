import { useCallback, useEffect, useRef, useState } from "react";
import type { Segment } from "./qualification";
import { track } from "./analytics";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface ChatState {
  segment: Segment | null;
  leadScore: number;
  tier: "hot" | "warm" | "cold";
  completion: number;
  qualified: boolean;
}

type StreamEvent =
  | { type: "token"; text: string }
  | { type: "state"; segment: Segment | null; leadScore: number; tier: ChatState["tier"]; completion: number }
  | {
      type: "done";
      segment: Segment | null;
      leadScore: number;
      tier: ChatState["tier"];
      completion: number;
      qualified: boolean;
      notified: boolean;
    }
  | { type: "error"; error: string };

const SESSION_KEY = "klima_chat_session_id";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/klima-chat`;

function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  let id = window.localStorage.getItem(SESSION_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `sess_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    window.localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

let counter = 0;
const nextId = () => `m_${Date.now()}_${counter++}`;

export function useKlimaChat() {
  const sessionIdRef = useRef<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<ChatState>({
    segment: null,
    leadScore: 0,
    tier: "cold",
    completion: 0,
    qualified: false,
  });
  const started = useRef(false);
  // Funnel-Meilensteine nur je einmal pro Session melden.
  const segmentTracked = useRef(false);
  const qualifiedTracked = useRef(false);

  const applyEvent = useCallback((evt: StreamEvent, assistantIdRef: { id: string | null }) => {
    if ((evt.type === "state" || evt.type === "done") && evt.segment && !segmentTracked.current) {
      segmentTracked.current = true;
      track("klima_segment_detected", sessionIdRef.current, { segment: evt.segment });
    }
    if (evt.type === "done" && evt.qualified && !qualifiedTracked.current) {
      qualifiedTracked.current = true;
      track("klima_lead_qualified", sessionIdRef.current, {
        segment: evt.segment,
        tier: evt.tier,
        score: evt.leadScore,
      });
    }
    if (evt.type === "token") {
      const text = evt.text;
      setMessages((prev) => {
        if (assistantIdRef.id === null) {
          assistantIdRef.id = nextId();
          return [...prev, { id: assistantIdRef.id, role: "assistant", content: text }];
        }
        return prev.map((m) => (m.id === assistantIdRef.id ? { ...m, content: m.content + text } : m));
      });
    } else if (evt.type === "state") {
      setState((s) => ({
        ...s,
        segment: evt.segment,
        leadScore: evt.leadScore,
        tier: evt.tier,
        completion: evt.completion,
      }));
    } else if (evt.type === "done") {
      setState({
        segment: evt.segment,
        leadScore: evt.leadScore,
        tier: evt.tier,
        completion: evt.completion,
        qualified: evt.qualified,
      });
    } else if (evt.type === "error") {
      setError(evt.error);
    }
  }, []);

  const send = useCallback(
    async (text: string) => {
      setError(null);
      setLoading(true);
      if (text.trim()) {
        setMessages((prev) => [...prev, { id: nextId(), role: "user", content: text }]);
        track("klima_message_sent", sessionIdRef.current, { length: text.length });
      }

      const assistantIdRef = { id: null as string | null };
      try {
        const resp = await fetch(FUNCTION_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SUPABASE_ANON}`,
            apikey: SUPABASE_ANON,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId: sessionIdRef.current, message: text }),
        });

        if (!resp.ok || !resp.body) {
          let msg = `Verbindungsfehler (${resp.status})`;
          try {
            const j = await resp.json();
            if (j?.error) msg = j.error;
          } catch {
            /* non-JSON body */
          }
          throw new Error(msg);
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let sep: number;
          while ((sep = buffer.indexOf("\n\n")) !== -1) {
            const raw = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);
            const data = raw
              .split("\n")
              .filter((l) => l.startsWith("data:"))
              .map((l) => l.slice(5).trim())
              .join("");
            if (!data) continue;
            try {
              applyEvent(JSON.parse(data) as StreamEvent, assistantIdRef);
            } catch {
              /* ignore malformed event */
            }
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Verbindungsfehler");
        track("klima_chat_error", sessionIdRef.current, {
          message: e instanceof Error ? e.message : "unknown",
        });
      } finally {
        setLoading(false);
      }
    },
    [applyEvent],
  );

  // Greet on mount (empty message → server produces an opener).
  useEffect(() => {
    sessionIdRef.current = getSessionId();
    if (started.current) return;
    started.current = true;
    track("klima_chat_opened", sessionIdRef.current);
    void send("");
  }, [send]);

  const reset = useCallback(() => {
    if (typeof window !== "undefined") window.localStorage.removeItem(SESSION_KEY);
    sessionIdRef.current = getSessionId();
    setMessages([]);
    setState({ segment: null, leadScore: 0, tier: "cold", completion: 0, qualified: false });
    setError(null);
    started.current = true;
    segmentTracked.current = false;
    qualifiedTracked.current = false;
    track("klima_chat_opened", sessionIdRef.current, { reset: true });
    void send("");
  }, [send]);

  return { messages, loading, error, state, send, reset };
}
