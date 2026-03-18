import BlingLogo from "@/components/BlingLogo";
import { Link } from "react-router-dom";

const ImpressumPage = () => (
  <div className="min-h-screen bg-background">
    <header className="border-b bg-card">
      <div className="container flex items-center justify-between py-4">
        <Link to="/">
          <BlingLogo size={28} />
        </Link>
      </div>
    </header>
    <main className="container max-w-2xl py-12 space-y-8">
      <h1 className="text-3xl font-bold">Impressum</h1>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">bling</h2>
        <p className="text-muted-foreground">
          Copyright © 2026 by Studio Studio Agency | Alain Szerdahelyi
        </p>
        <p className="text-muted-foreground">All rights reserved.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Betreiber</h2>
        <address className="not-italic text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Studio Studio Agency</p>
          <p>CH-4054 Basel, Switzerland</p>
          <p>
            <a href="mailto:hello@studiostudio.ch" className="text-primary hover:underline">
              hello@studiostudio.ch
            </a>
          </p>
          <p>
            <a href="https://www.studiostudio.ch" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              www.studiostudio.ch
            </a>
          </p>
        </address>
      </section>

      <div className="pt-4 border-t">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Zurück zur Startseite
        </Link>
      </div>
    </main>
  </div>
);

export default ImpressumPage;
