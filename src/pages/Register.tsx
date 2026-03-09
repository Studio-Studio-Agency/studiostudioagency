import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import goodgoodsLogo from "@/assets/goodgoods-logo.svg";
import AppFooter from "@/components/AppFooter";

const Register = () => {
  const [vorname, setVorname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptDsgvo, setAcceptDsgvo] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptDsgvo) {
      toast({ title: "Bitte akzeptiere die Datenschutzerklärung", variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({ title: "Passwort muss mindestens 8 Zeichen haben", variant: "destructive" });
      return;
    }
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { vorname },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      toast({ title: "Fehler bei der Registrierung", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Fast geschafft! 🎉",
        description: "Bitte bestätige deine E-Mail-Adresse über den Link in deinem Posteingang.",
      });
      navigate("/login");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1 items-center justify-center px-4">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            <img src={goodgoodsLogo} alt="GoodGoods" className="h-6 w-auto" />
          </div>
          <CardDescription>Konto erstellen und kostenlos starten</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vorname">Vorname</Label>
              <Input
                id="vorname"
                value={vorname}
                onChange={(e) => setVorname(e.target.value)}
                placeholder="Max"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="deine@email.ch"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Passwort (min. 8 Zeichen)</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
              />
            </div>
            <div className="flex items-start space-x-2">
              <Checkbox
                id="dsgvo"
                checked={acceptDsgvo}
                onCheckedChange={(checked) => setAcceptDsgvo(checked === true)}
              />
              <Label htmlFor="dsgvo" className="text-sm leading-tight">
                Ich akzeptiere die{" "}
                <Link to="/datenschutz" className="text-primary hover:underline">
                  Datenschutzerklärung
                </Link>
              </Label>
            </div>
            <Button type="submit" className="w-full" disabled={loading || !acceptDsgvo}>
              {loading ? <Loader2 className="animate-spin" /> : "Registrieren"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Bereits ein Konto?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Anmelden
            </Link>
          </p>
        </CardContent>
      </Card>
      </div>
      <AppFooter />
    </div>
  );
};

export default Register;
