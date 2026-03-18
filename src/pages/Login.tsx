import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import goodgoodsLogo from "@/assets/goodgoods-logo-new.png";
import AppFooter from "@/components/AppFooter";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast({
        title: "Fehler beim Anmelden",
        description: error.message === "Invalid login credentials"
          ? "E-Mail oder Passwort ist falsch."
          : error.message,
        variant: "destructive",
      });
    } else {
      navigate("/listen");
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
          <CardDescription>Melde dich an, um deine Einkaufslisten zu verwalten</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
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
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : "Anmelden"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground space-y-2">
            <Link to="/passwort-vergessen" className="block text-primary hover:underline">
              Passwort vergessen?
            </Link>
            <p>
              Noch kein Konto?{" "}
              <Link to="/registrieren" className="text-primary hover:underline font-medium">
                Jetzt registrieren
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
      </div>
      <AppFooter />
    </div>
  );
};

export default Login;