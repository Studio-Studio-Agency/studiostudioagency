import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Segment } from "./qualification";

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

interface EdgeResponse {
  reply: string;
  segment: Segment | null;
  leadScore: number;
  tier: "hot" | "warm" | "cold";
  completion: number;
  qualified: boolean;
  notified: boolean;
  error?: string;
}

const SESSION_KEY = "klima_chat_session_id";

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

  const send = useCallback(async (text: string) => {
    setError(null);
    setLoading(true);
    if (text.trim()) {
      setMessages((prev) => [...prev, { id: nextId(), role: "user", content: text }]);
    }
    try {
      const { data, error: fnError } = await supabase.functions.invoke<EdgeResponse>("klima-chat", {
        body: { sessionId: sessionIdRef.current, message: text },
      });
      if (fnError) throw fnError;
      if (!data || data.error) throw new Error(data?.error || "Keine Antwort erhalten");

      setMessages((prev) => [...prev, { id: nextId(), role: "assistant", content: data.reply }]);
      setState({
        segment: data.segment,
        leadScore: data.leadScore,
        tier: data.tier,
        completion: data.completion,
        qualified: data.qualified,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verbindungsfehler");
    } finally {
      setLoading(false);
    }
  }, []);

  // Greet on mount (empty message → server produces an opener).
  useEffect(() => {
    sessionIdRef.current = getSessionId();
    if (started.current) return;
    started.current = true;
    void send("");
  }, [send]);

  const reset = useCallback(() => {
    if (typeof window !== "undefined") window.localStorage.removeItem(SESSION_KEY);
    sessionIdRef.current = getSessionId();
    setMessages([]);
    setState({ segment: null, leadScore: 0, tier: "cold", completion: 0, qualified: false });
    setError(null);
    started.current = true;
    void send("");
  }, [send]);

  return { messages, loading, error, state, send, reset };
}
