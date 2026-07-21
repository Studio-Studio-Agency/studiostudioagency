/**
 * Minimaler Login-Schutz für das Lead-Dashboard im Standalone-Build.
 * (Die Haupt-App nutzt stattdessen ihren eigenen ProtectedRoute/Login-Flow.)
 *
 * Nur E-Mail + Passwort — Konten werden im Supabase-Dashboard angelegt.
 * Die eigentliche Autorisierung (KLIMA_ADMIN_EMAILS) prüft die
 * klima-admin Edge-Function serverseitig; dieses Gate liefert nur das JWT.
 */
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { Snowflake, LogIn, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function KlimaAuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) setError("Anmeldung fehlgeschlagen — bitte E-Mail und Passwort prüfen.");
    setSubmitting(false);
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (session) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky-50 to-white px-4 dark:from-slate-950 dark:to-slate-900">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-sky-600 to-cyan-500 text-white">
            <Snowflake className="h-5 w-5" />
          </div>
          <CardTitle>Lead-Dashboard</CardTitle>
          <p className="text-sm text-muted-foreground">Anmeldung für Klimapartner-Mitarbeitende</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3">
            <Input
              type="email"
              placeholder="E-Mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <Input
              type="password"
              placeholder="Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-4 w-4" />
              )}
              Anmelden
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
