import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import goodgoodsLogo from "@/assets/goodgoods-logo-new.png";

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};

const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

const OAuthConsent = () => {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Es fehlt die authorization_id in der URL.");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorizationId)
      : await oauth().denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("Der Autorisierungsserver hat keine Weiterleitung zurückgegeben.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center">
          <div className="mb-3 flex justify-center">
            <img src={goodgoodsLogo} alt="GoodGoods" className="h-6 w-auto" />
          </div>
          {error ? (
            <>
              <CardTitle className="text-lg">Zugriff nicht möglich</CardTitle>
              <CardDescription>{error}</CardDescription>
            </>
          ) : !details ? (
            <CardDescription className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Anfrage wird geladen…
            </CardDescription>
          ) : (
            <>
              <CardTitle className="text-lg">
                {details.client?.name ?? "Eine App"} mit GoodGoods verbinden
              </CardTitle>
              <CardDescription>
                {details.client?.name ?? "Die App"} darf danach in deinem Namen auf deine Einkaufslisten,
                Artikel und deinen Vorrat zugreifen.
              </CardDescription>
            </>
          )}
        </CardHeader>
        {details && !error && (
          <CardContent className="flex gap-3">
            <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>
              Ablehnen
            </Button>
            <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Erlauben"}
            </Button>
          </CardContent>
        )}
      </Card>
    </main>
  );
};

export default OAuthConsent;
