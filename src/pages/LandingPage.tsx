import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Bot, Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const LandingPage = () => {
  const { user, loading } = useAuth();
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    // Simple count - just a rough number for social proof
    const fetchCount = async () => {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      setUserCount(count || 0);
    };
    fetchCount();
  }, []);

  if (!loading && user) {
    return <Navigate to="/listen" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container flex h-14 items-center justify-between">
          <span className="font-bold text-lg">🥬 FreshFresh AI</span>
          <div className="flex gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm">Anmelden</Button>
            </Link>
            <Link to="/registrieren">
              <Button size="sm">Kostenlos starten</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-20 text-center animate-fade-in">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Schluss mit weggeworfenen<br />Lebensmitteln.
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
          FreshFresh AI erinnert dich automatisch, bevor dein Essen schlecht wird – 
          ganz ohne manuelles Eintragen.
        </p>
        <Link to="/registrieren">
          <Button size="lg" className="text-base px-8">
            Kostenlos starten →
          </Button>
        </Link>
        {userCount > 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            Bereits {userCount} {userCount === 1 ? "Nutzer" : "Nutzer"} dabei
          </p>
        )}
      </section>

      {/* Features */}
      <section className="container pb-20">
        <div className="grid gap-8 md:grid-cols-3 max-w-3xl mx-auto">
          <FeatureCard
            icon={<ShoppingCart className="h-8 w-8 text-primary" />}
            title="Einkaufen"
            description="Erstelle deine Liste und hake Artikel beim Kauf ab."
          />
          <FeatureCard
            icon={<Bot className="h-8 w-8 text-primary" />}
            title="KI analysiert"
            description="Claude AI berechnet automatisch die Haltbarkeit deiner Lebensmittel."
          />
          <FeatureCard
            icon={<Calendar className="h-8 w-8 text-primary" />}
            title="Rechtzeitig erinnert"
            description="Kalender-Erinnerung bevor das Essen schlecht wird."
          />
        </div>
      </section>

      {/* iOS Waitlist */}
      <WaitlistSection />

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container flex flex-wrap gap-4 justify-center text-sm text-muted-foreground">
          <Link to="/datenschutz" className="hover:underline">Datenschutz</Link>
          <Link to="/impressum" className="hover:underline">Impressum</Link>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="rounded-lg border bg-card p-6 text-center animate-slide-up">
    <div className="flex justify-center mb-3">{icon}</div>
    <h3 className="font-semibold text-lg mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

const WaitlistSection = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    supabase
      .from("ios_waitlist")
      .select("*", { count: "exact", head: true })
      .then(({ count }) => setCount(count || 0));
  }, [done]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("ios_waitlist").insert({ email });
    if (!error) setDone(true);
    setLoading(false);
  };

  return (
    <section className="bg-accent py-16">
      <div className="container text-center max-w-md mx-auto">
        <h2 className="text-2xl font-bold mb-2">📱 iOS App coming soon!</h2>
        <p className="text-muted-foreground mb-4">Trage dich auf die Warteliste ein.</p>
        {done ? (
          <p className="text-primary font-medium">✅ Du bist auf der Liste!</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="deine@email.ch"
              required
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
            />
            <Button type="submit" disabled={loading} size="sm">
              Eintragen
            </Button>
          </form>
        )}
        {count > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Bereits {count} Personen auf der Warteliste
          </p>
        )}
      </div>
    </section>
  );
};

export default LandingPage;
