import { Snowflake, ShieldCheck, MapPin, Sun, Banknote } from "lucide-react";
import KlimaChat from "@/components/klima/KlimaChat";

const REGIONS = ["Basel-Stadt", "Basel-Landschaft", "Aargau", "Solothurn"];

const BENEFITS = [
  {
    icon: ShieldCheck,
    title: "Geprüfte Partner",
    text: "Wir vermitteln ausschliesslich an sorgfältig ausgewählte, regionale Installationsbetriebe.",
  },
  {
    icon: Banknote,
    title: "Förderung inklusive",
    text: "Wir prüfen, welche Subventionen und Förderprogramme für Ihr Projekt in Frage kommen.",
  },
  {
    icon: Sun,
    title: "Bereit für den Sommer",
    text: "Von der Beratung bis zur Inbetriebnahme — ein Ansprechpartner für Kühlen und Heizen.",
  },
];

export default function KlimapartnerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b bg-white/70 backdrop-blur dark:bg-slate-900/70">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-600 to-cyan-500 text-white">
            <Snowflake className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">Klimapartner Basel</span>
          <span className="ml-auto hidden items-center gap-1 text-sm text-muted-foreground sm:flex">
            <MapPin className="h-4 w-4" /> {REGIONS.join(" · ")}
          </span>
        </div>
      </header>

      {/* Hero + chat */}
      <main className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-2 lg:py-16">
        <div className="flex flex-col justify-center">
          <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-700 dark:bg-sky-950 dark:text-sky-300">
            <Sun className="h-4 w-4" /> Klimaanlagen für die Region Basel
          </span>
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            Kühl durch den Sommer — mit dem richtigen Partner.
          </h1>
          <p className="mt-4 max-w-md text-muted-foreground">
            Erzählen Sie unserem Klima-Berater kurz von Ihrem Vorhaben. In wenigen Minuten
            klären wir Ihren Bedarf und vermitteln Sie an einen geprüften Installationspartner
            in Basel-Stadt, Baselland, Aargau oder Solothurn — unverbindlich und kostenlos.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-1">
            {BENEFITS.map((b) => (
              <div key={b.title} className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                  <b.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{b.title}</p>
                  <p className="text-sm text-muted-foreground">{b.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center">
          <KlimaChat />
        </div>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        Klimapartner Basel · Concierge & Generalunternehmer für Klimatechnik ·
        {" "}Servicegebiet: {REGIONS.join(", ")}
      </footer>
    </div>
  );
}
