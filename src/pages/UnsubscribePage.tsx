import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, MailX } from "lucide-react";

const UnsubscribePage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "valid" | "already" | "invalid" | "success" | "error">("loading");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    const validate = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`,
          { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
        );
        const data = await res.json();
        if (data.valid === false && data.reason === "already_unsubscribed") {
          setStatus("already");
        } else if (data.valid) {
          setStatus("valid");
        } else {
          setStatus("invalid");
        }
      } catch {
        setStatus("invalid");
      }
    };
    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) throw error;
      if (data?.success) {
        setStatus("success");
      } else if (data?.reason === "already_unsubscribed") {
        setStatus("already");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
    setProcessing(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">Wird überprüft…</p>
            </>
          )}
          {status === "valid" && (
            <>
              <MailX className="h-10 w-10 mx-auto text-muted-foreground" />
              <h1 className="text-xl font-bold">E-Mail-Benachrichtigungen abbestellen</h1>
              <p className="text-sm text-muted-foreground">
                Möchtest du keine E-Mail-Benachrichtigungen mehr von GoodGoods erhalten?
              </p>
              <Button onClick={handleUnsubscribe} disabled={processing} className="w-full">
                {processing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Abbestellen bestätigen
              </Button>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle className="h-10 w-10 mx-auto text-primary" />
              <h1 className="text-xl font-bold">Erfolgreich abgemeldet</h1>
              <p className="text-sm text-muted-foreground">
                Du wirst keine weiteren E-Mail-Benachrichtigungen mehr erhalten.
              </p>
            </>
          )}
          {status === "already" && (
            <>
              <CheckCircle className="h-10 w-10 mx-auto text-muted-foreground" />
              <h1 className="text-xl font-bold">Bereits abgemeldet</h1>
              <p className="text-sm text-muted-foreground">
                Du hast dich bereits von E-Mail-Benachrichtigungen abgemeldet.
              </p>
            </>
          )}
          {status === "invalid" && (
            <>
              <XCircle className="h-10 w-10 mx-auto text-destructive" />
              <h1 className="text-xl font-bold">Ungültiger Link</h1>
              <p className="text-sm text-muted-foreground">
                Dieser Abmelde-Link ist ungültig oder abgelaufen.
              </p>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="h-10 w-10 mx-auto text-destructive" />
              <h1 className="text-xl font-bold">Fehler</h1>
              <p className="text-sm text-muted-foreground">
                Es ist ein Fehler aufgetreten. Bitte versuche es später erneut.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UnsubscribePage;
