import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Bot, Calendar, ArrowRight, Sparkles, Shield, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, type Easing } from "framer-motion";
import { useTheme } from "next-themes";
import goodgoodsLogo from "@/assets/goodgoods-logo.svg";
import goodgoodsLogoDark from "@/assets/goodgoods-logo-dark.svg";
import overripeBanana from "@/assets/overripe-banana.png";
import AppFooter from "@/components/AppFooter";

const ease: Easing = [0.25, 0.1, 0.25, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease },
  }),
};

const LandingPage = () => {
  const { user, loading } = useAuth();
  const { resolvedTheme } = useTheme();
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    supabase.from("profiles").select("*", { count: "exact", head: true })
      .then(({ count }) => setUserCount(count || 0));
  }, []);

  if (!loading && user) return <Navigate to="/listen" replace />;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <img src={resolvedTheme === "dark" ? goodgoodsLogoDark : goodgoodsLogo} alt="GoodGoods" className="h-6 w-auto" />
          <Link to="/login">
            <Button variant="ghost" size="sm">Anmelden</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-accent/30" />
        <div className="absolute top-20 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-20 -left-32 w-80 h-80 rounded-full bg-primary/8 blur-3xl" />

        <div className="container relative py-24 md:py-32 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-5 py-2 text-sm md:text-base font-semibold text-primary mb-8 shadow-sm shadow-primary/10 backdrop-blur-sm">
              <Sparkles className="h-4 w-4 md:h-5 md:w-5" />
              KI-gestützte Haltbarkeitsanalyse
            </span>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8, rotate: -8 }} 
            animate={{ opacity: 1, scale: 1, rotate: 3 }} 
            transition={{ delay: 0.15, duration: 0.6, type: "spring", bounce: 0.4 }}
            className="flex justify-center mb-6 relative z-10"
          >
            <img src={overripeBanana} alt="Überreife Banane" className="h-36 md:h-48 drop-shadow-2xl hover:scale-110 hover:rotate-0 transition-all duration-500 cursor-pointer" />
          </motion.div>

          <motion.h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6"
            initial="hidden" animate="visible" variants={fadeUp} custom={1}
          >
            Schluss mit{" "}
            <span className="bg-gradient-to-r from-primary to-success bg-clip-text text-transparent">
              weggeworfenen
            </span>
            <br />Lebensmitteln.
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-bold text-muted-foreground dark:text-foreground"
            initial="hidden" animate="visible" variants={fadeUp} custom={2}
          >
            GoodGoods erinnert dich automatisch, bevor dein Essen schlecht wird –
            ganz ohne manuelles Eintragen von Ablaufdaten.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-3 justify-center items-center"
            initial="hidden" animate="visible" variants={fadeUp} custom={3}
          >
            <Link to="/registrieren">
              <Button size="lg" className="text-base px-8 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
                Kostenlos starten <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            {userCount > 0 && (
              <span className="text-sm text-muted-foreground">
                Bereits <strong className="text-foreground">{userCount}</strong> Nutzer dabei
              </span>
            )}
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="container py-20 md:py-28">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-3">So einfach geht's</h2>
          <p className="text-muted-foreground text-lg">Drei Schritte – kein Aufwand</p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
          {[
            { icon: ShoppingCart, title: "1. Einkaufen", desc: "Erstelle deine Liste und hake Artikel beim Kauf ab." },
            { icon: Bot, title: "2. KI analysiert", desc: "Haltbarkeit wird automatisch berechnet – du musst nichts eingeben." },
            { icon: Calendar, title: "3. Erinnert werden", desc: "Kalender-Erinnerung, bevor das Essen schlecht wird." },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              className="group rounded-2xl border bg-card p-8 text-center hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300"
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
            >
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                <f.icon className="h-7 w-7" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y bg-muted/30">
        <div className="container py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { icon: Shield, label: "DSGVO-konform" },
            { icon: Sparkles, label: "KI-gestützt" },
            { icon: Users, label: "Geteilte Listen" },
            { icon: Calendar, label: "Kalender-Sync" },
          ].map((t) => (
            <div key={t.label} className="flex flex-col items-center gap-2">
              <t.icon className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">{t.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* iOS Waitlist */}
      <WaitlistSection />

      {/* CTA */}
      <section className="container py-20 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }} transition={{ duration: 0.4 }}
          className="max-w-lg mx-auto"
        >
          <h2 className="text-3xl font-bold mb-4">Bereit, weniger wegzuwerfen?</h2>
          <p className="text-muted-foreground mb-6">Erstelle dein Konto in 30 Sekunden. Kostenlos.</p>
          <Link to="/registrieren">
            <Button size="lg" className="text-base px-10 shadow-lg shadow-primary/20">
              Jetzt starten <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </section>

      <div className="mt-auto">
        <AppFooter />
      </div>
    </div>
  );
};

const WaitlistSection = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    supabase.from("ios_waitlist").select("*", { count: "exact", head: true })
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
    <section className="bg-accent/50 py-16">
      <div className="container text-center max-w-md mx-auto">
        <h2 className="text-2xl font-bold mb-2">📱 iOS App kommt bald</h2>
        <p className="text-muted-foreground mb-5">Trage dich auf die Warteliste ein.</p>
        {done ? (
          <motion.p initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="text-primary font-medium">
            ✅ Du bist auf der Liste!
          </motion.p>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="deine@email.ch" required
              className="flex-1 rounded-lg border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button type="submit" disabled={loading}>Eintragen</Button>
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