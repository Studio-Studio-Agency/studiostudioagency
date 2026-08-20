# Vaulteer — Website

Statische Website fuer die **Vaulteer GmbH**, Basel-Stadt. Lokale KI-Systeme
fuer Schweizer KMU, Beratung zu Datensouveraenitaet.

```sh
npm install
npm run dev        # Entwicklungsserver auf http://localhost:4321/vaulteer
npm run build      # Vorschau-Build: dev.studiostudio.ch/vaulteer
npm run build:live # Live-Build: vaulteer.ch
npm run preview    # Ausgabe lokal pruefen
```

Die Seite laeuft zuerst unter **`dev.studiostudio.ch/vaulteer`**, also in
einem Unterverzeichnis einer fremden Domain. Host, Basispfad und
Indexierbarkeit stehen deshalb in drei Umgebungsvariablen und nicht fest im
Code:

| | Vorschau (Standard) | Live |
|---|---|---|
| `SITE_URL` | `https://dev.studiostudio.ch` | `https://vaulteer.ch` |
| `BASE_PATH` | `/vaulteer` | `/` |
| `SITE_INDEXABLE` | nicht gesetzt | `true` |

Zwei Regeln, die daraus folgen:

- **Interne Links immer ueber `withBase()`** aus `src/config/site.ts`. Ein
  nacktes `href="/leistungen"` zeigt in der Vorschau ins Leere.
- **Die Vorschau ist nicht indexierbar.** Solange `SITE_INDEXABLE` fehlt,
  traegt jede Seite `noindex, nofollow` und `robots.txt` sperrt alles. Das
  verhindert, dass ein unfertiger Stand unter fremder Domain in den Index
  gerat und der spaeteren eigenen Domain Rang wegnimmt.

Deployment: siehe [DEPLOY.md](./DEPLOY.md). Bildauftraege: siehe
[IMAGE-BRIEF.md](./IMAGE-BRIEF.md).

---

## Inhaltsquelle

Saemtliche Texte stammen aus dem Content-Brief des Auftraggebers und sind
woertlich uebernommen — nicht gekuerzt, nicht geglaettet, nicht umformuliert.
Wo der Brief nur Stichpunkte liefert (Branchenseiten Treuhand,
Gesundheitswesen, Industrie), sind diese zu Saetzen ausformuliert, ohne neue
Sachbehauptungen einzufuehren. Wo Substanz fehlt, steht `[TODO: Text
ergaenzen]`.

**Der Brief selbst liegt nicht im Repository.** Er kam ueber den Chatverlauf.
Er gehoert als `content-brief.md` hierher committet, damit spaetere Aenderungen
eine Quelle haben, gegen die sie sich pruefen lassen.

Offene Stammdaten sind mit `[TODO: ...]` markiert, in `src/config/site.ts`
gebuendelt und in `TODO.md` gesammelt.

---

## Stack

| Baustein | Wahl | Begruendung |
|---|---|---|
| Framework | Astro 5, `output: 'static'` | Reines HTML ohne JavaScript-Overhead. Ladezeit und Suchmaschinen-Sichtbarkeit sind die beiden Kennzahlen, die hier zaehlen. |
| Sprache | TypeScript, `astro/tsconfigs/strict` | |
| CSS | Tailwind CSS 4 ueber `@tailwindcss/vite` | Tokens als `@theme`-Variablen, Typoskala als `@utility`. |
| Inhalte | MDX ueber Astro Content Collections | Wissensbereich, Schema mit Zod validiert. |
| Icons | `@lucide/astro` (ISC), lokal gebuendelt | Kein CDN. |
| Bilder | Astro `<Image />`, AVIF mit WebP-Fallback | Bis Bildmaterial vorliegt: `<ImagePlaceholder />`. |

Astro 7 ist inzwischen verfuegbar. Das Projekt bleibt bei der beauftragten
Version 5; ein Wechsel ist ein eigener, ueberschaubarer Schritt und braucht
eine Entscheidung, keine stille Abweichung.

## Keine Verbindungen zu Drittdomains

Der Auftraggeber verkauft Datensouveraenitaet. Die eigene Website darf deshalb
keine Verbindung zu US-Diensten aufbauen. Nicht enthalten und nicht
nachtraeglich einzubauen:

- Google Fonts, Google Analytics, Tag Manager, reCAPTCHA
- eingebettete YouTube-, Vimeo- oder Maps-iframes
- externe Icon- oder JS-CDNs
- US-Formulardienste

**Pruefergebnis Schritt 1:** Chromium, Netzwerk-Tab ueber alle gebauten Seiten,
Viewports 320 / 768 / 1024 / 1440 / 1920 px — **null Requests an Drittdomains.**
Die einzigen `http`-Vorkommen im Build sind der SVG-Namespace
(`http://www.w3.org/2000/svg`, kein Request), ein Kommentarlink im
Tailwind-Bundle und die eigene Domain in Canonical- und Open-Graph-Angaben.
Der Test laeuft ueber `npm run build && npm run preview` und ist bei jeder
Aenderung zu wiederholen.

**Analytik** ist bewusst nicht eingebaut. In `src/layouts/BaseLayout.astro`
steht ein Kommentar an der Stelle, an der ein selbstgehostetes Plausible-
oder Matomo-Snippet eingesetzt wuerde.

**Karten:** falls spaeter noetig, statisches Bild oder ein
OpenStreetMap-Link, der in einem neuen Tab oeffnet. Kein iframe.

**Formular:** Es existiert noch kein Backend. Zwei souveraene Optionen, wenn es
so weit ist:

1. **Eigener Endpunkt beim Schweizer Hoster.** Ein kleines PHP- oder
   Node-Skript auf dem eigenen Webhosting nimmt den POST entgegen und
   versendet per SMTP.
   Daten verlassen die Schweiz nicht. Als Spamschutz ein Honeypot-Feld und eine
   Zeitmessung — kein reCAPTCHA.
2. **EU-gehosteter Dienst**, z. B. Formspark oder ein selbstgehostetes
   Formbricks. Zweite Wahl, weil die Daten dann bei einem Dritten liegen.

Bis dahin traegt das Formular einen `action`-Platzhalter, und die
E-Mail-Adresse steht sichtbar als Alternative daneben.

---

## Designentscheidungen

### Grundton: Weiss dominant

Die Seite laeuft auf `--paper` mit einzelnen dunklen Sektionen. Der
Wissensbereich ist laut Strategie im ersten Jahr der wichtigere Kanal, und
lange Fachtexte lesen sich auf Weiss besser. Dunkle Flaechen setzen Akzente:
Fusszeile, einzelne Sektionen, Bild-Platzhalter.

### Signature-Element: der Rahmen

Die Seite sitzt in einem 1 px duennen Rahmen in `--ink`, 16 px vom
Viewport-Rand entfernt (mobil 10 px), `position: fixed`. Der Inhalt laeuft
darin durch. An der linken oberen Ecke sitzt ein 8x8-px-Quadrat in
`--signal` — das Siegel, der einzige orange Fixpunkt der Seite. Auf
Sektionstrennlinien wiederholt sich dasselbe Quadrat am linken Ende.

Die Idee ist uebernommen, nicht ersetzt: Sie uebersetzt das Produkt
(*alles bleibt innerhalb der Umgrenzung, nichts tritt aus*) direkt in Form,
kostet null Kilobyte und funktioniert auf jeder Seite gleich. Eine bessere
Alternative war nicht in Sicht.

Umgesetzt ist er als ein einziges `<div class="site-frame">` mit
`pointer-events: none` und einem `box-shadow: 0 0 0 100vmax var(--paper)`.
Der Schatten maskiert den Bereich ausserhalb des Rahmens: Beim Scrollen tritt
kein Inhalt aus der Umgrenzung, auch keine dunkle Sektion.

Die Sektionstrennlinien laufen bis an den Rahmen — ihr oranges Quadrat sitzt
damit auf der Rahmenlinie und liest sich als Markierung am Rand des Dokuments.
Das ist eine Entscheidung, kein Zufall.

### Typografie

Kein Webfont-Download. Helvetica ist nicht frei als Webfont lizenzierbar, und
ein Font-Request widerspricht dem Performance- und Souveraenitaetsanspruch.
Der Stack ist:

```css
--font-sans: "Helvetica Neue", Helvetica, "Inter", "Arial", sans-serif;
```

**Ehrliche Konsequenz:** Auf macOS und iOS erscheint Helvetica Neue, auf
Windows in aller Regel Arial. Fuer Laien ist der Unterschied unsichtbar, fuer
einen Grafiker nicht — Arial hat andere Terminals, ein anderes R und laeuft
minimal breiter. Die negative Laufweite in den grossen Graden ist auf
Helvetica abgestimmt und wirkt in Arial etwas straffer.

Soll spaeter eine echte Helvetica Now oder eine selbstgehostete Inter zum
Einsatz kommen: Der Stack steht an **genau einer Stelle**, in
`src/styles/global.css` als `--font-sans`. Zusaetzlich braucht es dort einen
`@font-face`-Block mit `font-display: swap` und lokal abgelegten woff2-Dateien.
Keine Komponente kennt einen Schriftnamen.

Zwei Gewichte, 400 und 700. Kein 500, kein 600. Flattersatz rechts durchgehend.
Die Typoskala liegt als Utilities `type-display` bis `type-eyebrow` vor, die
Werte sind in `global.css` dokumentiert und entsprechen der Vorgabe.

### Farbe und Kontrast

Alle Tokens stehen im `@theme`-Block von `src/styles/global.css`.

- `--signal` auf Weiss erreicht als Text nur ca. 3.3:1 und wird nicht fuer
  Fliesstext verwendet — nur Flaechen, Linien, Marker.
- Orange Textauszeichnung auf Weiss immer `--signal-deep` (ca. 4.6:1).
- Primaerbutton: Flaeche `--signal`, Schrift `--ink` (ca. 5.9:1). Weisse
  Schrift auf Orange gibt es im System nicht.
- Orange nie mehr als ca. fuenf Prozent Flaeche pro Bildschirm. Ausnahme ist
  genau eine Sektion pro Seite, der Abschluss-CTA.

**Ergaenzung zum Brief:** `--ink-muted` (#6E6E76) ist als Sekundaertext *auf
Weiss* definiert und faellt auf dunklem Grund auf ca. 3.4:1 — unter AA. Fuer
Sekundaertext auf `--ink` gibt es deshalb ein zusaetzliches Token
`--paper-muted` (#A9A9AF, ca. 7.6:1). Ohne dieses Token waere die Fusszeile
nicht barrierefrei.

### Bewegung

Nur drei Faelle: der versetzte Eintritt von H1 und Lead auf der Startseite
(60 ms Abstand, 240 ms, `ease-out`, nur Opazitaet und 8 px Y-Versatz, einmalig),
die von links wachsende orange Unterstreichung bei Links (160 ms) und der
Farbwechsel bei Buttons (120 ms). `prefers-reduced-motion: reduce` schaltet
alles ab.

### Kein JavaScript

Der Auftrag erlaubt kleine Vanilla-JS-Inseln fuer mobile Navigation,
FAQ-Akkordeon und Formular. Umgesetzt sind mobile Navigation und Akkordeon
stattdessen mit `<details>` / `<summary>`: nativ tastaturbedienbar, korrekt
fuer Screenreader, null Kilobyte. **Das Build liefert bisher keine einzige
JavaScript-Datei aus.**

---

## Projektstruktur

```
vaulteer/
├─ src/
│  ├─ components/     Button, Eyebrow, SectionRule, Faq, PriceTable,
│  │                  ImagePlaceholder, PageHeader, SectorPage, LegalPage,
│  │                  Header, Footer, Wordmark
│  ├─ config/
│  │  ├─ site.ts      Stammdaten, Navigation, withBase(), Indexierbarkeit
│  │  ├─ faq.ts       FAQ aus Teil 13 — Quelle fuer Text UND JSON-LD
│  │  ├─ images.ts    Slot-Verzeichnis der Bildplatzhalter
│  │  └─ schema.ts    JSON-LD: Organization, LocalBusiness, FAQPage, Article
│  ├─ content/wissen/ Fachbeitraege (MDX), Schema in src/content.config.ts
│  ├─ layouts/        BaseLayout mit Rahmen, Meta, JSON-LD
│  ├─ pages/          20 Seiten, siehe Sitemap im Brief
│  └─ styles/         global.css: Tokens, Typoskala, Utilities
├─ IMAGE-BRIEF.md     Bildauftraege je Slot
├─ TODO.md            Was vor dem Livegang von aussen kommen muss
└─ DEPLOY.md          Build und Upload, Vorschau und Live
```

### Zwei Stellen, an denen eine Aenderung zwei Dinge gleichzeitig richtig haelt

- **`src/config/faq.ts`** speist den sichtbaren FAQ-Text und das
  FAQPage-JSON-LD. Sie koennen nicht auseinanderlaufen — was in strukturierten
  Daten steht, steht auch auf der Seite. Das ist nicht nur sauber, sondern
  Vorgabe von Google.
- **`src/config/images.ts`** speist die Platzhalter im Layout und den
  Bildauftrag. Ein neuer Slot wird an einer Stelle eingetragen.

## Stand der Umsetzung

| Schritt | Umfang | Stand |
|---|---|---|
| 1 | Fundament: Rahmen, Tokens, Typoskala, Kopf, Fuss, Musterseite | fertig |
| 2 | Startseite, alle acht Sektionen | fertig |
| 3 | Leistungsuebersicht und drei Leistungsseiten | fertig |
| 4 | Vorgehen und Preise | fertig |
| 5 | Branchenuebersicht und vier Branchenseiten | fertig; drei `[TODO: Text ergaenzen]` in den Geruest-Seiten |
| 6 | Wissensbereich, Collection, Beitragsvorlage | fertig; Pillar-Artikel liegt als Entwurf mit Gliederung |
| 7 | Ueber uns, Kontakt, Impressum, Datenschutz, AGB, 404 | fertig; Rechtstexte bewusst leer, siehe unten |
| 8 | Sitemap, robots.txt, JSON-LD, Meta, Pruefung | fertig |

20 Seiten. Was noch fehlt, steht in `TODO.md` — und zwar ausschliesslich das,
was von aussen kommen muss: Stammdaten, Team, Bilder, Rechtstexte, Logo.

### Rechtstexte sind absichtlich leer

Impressum, Datenschutzerklaerung und AGB zeigen nur die erforderlichen
Abschnitte und stehen auf `noindex`. Der Brief verlangt fuer zwei davon eine
anwaltliche Pruefung und schliesst Generator-Text ausdruecklich aus. Bei einem
Anbieter fuer Datensouveraenitaet ist eine fehlerhafte Datenschutzerklaerung
geschaeftsschaedigend, nicht nur formal falsch — generierter Platzhaltertext
waere hier das groessere Risiko als eine sichtbar leere Seite.

## Qualitaetsziele — gemessen

Gemessen am Live-Build (`npm run build:live`), Lighthouse 13.4.1,
Mobil-Voreinstellung:

| Seite | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| Startseite | 100 | 100 | 100 | 100 |
| `/leistungen/local-ai` | 100 | 100 | 100 | 100 |
| `/vorgehen` | 100 | 100 | 100 | 100 |

Alle 20 Seiten wurden zusaetzlich auf Desktop geprueft: durchgehend 100 fuer
Performance, Accessibility und Best Practices.

Hinweis zum SEO-Wert: Im **Vorschau**-Build liegt er bei 63, weil jede Seite
`noindex` traegt. Das ist gewollt und kein Mangel — die Vorschau gehoert nicht
in den Suchindex.

Weiter geprueft:

- **Gewicht der Startseite** ohne Bilder: 8 KB HTML, 5 KB CSS, **0 KB
  JavaScript** (gzip). Grenze laut Brief: 100 KB.
- **Keine einzige Verbindung zu einer Drittdomain.** Alle 19 Seiten im Browser
  aufgerufen und jeden Request mitgeschnitten: ausschliesslich `localhost`.
- **Tastatur:** erstes Tab-Ziel ist der Sprunglink, Fokusring `#FF3B14`, 2 px,
  2 px Offset.
- **Breiten 320, 768, 1024, 1440, 1920 px:** kein horizontaler Scroll.
- **Semantik:** genau ein `<h1>` je Seite, keine Ueberschriftenspruenge,
  `lang="de-CH"`, alle Titles <= 60 und Descriptions <= 155 Zeichen.

### Drei Befunde aus der Pruefung, die behoben wurden

1. **`container-grid` war kein Raster.** Die Utility setzte nur Breite und
   Innenabstand. Saemtliche `col-span-*`-Klassen liefen ins Leere,
   Ueberschrift und Fliesstext lagen uebereinander. Das 12-Spalten-Raster
   steht jetzt als eigene Utility `grid-12` daneben.
2. **FAQ-Markup war ungueltig.** `<details>` stand in einer `<dl>`, was der
   HTML-Standard nicht erlaubt. Ohne `<dl>` neu gebaut — Accessibility von 92
   auf 100.
3. **Kontrast auf getoenter Flaeche.** `--ink-muted` und `--signal-deep` sind
   im Brief als Werte fuer **Weiss** definiert und dort AA-konform. Auf
   `--paper-shade` fallen sie auf 4.47:1 beziehungsweise 4.42:1 und verfehlen
   AA knapp. Statt an jeder Stelle eine andere Klasse zu waehlen, entscheidet
   jetzt die Flaeche: `.bg-paper-shade` dunkelt beide Werte eine Spur ab. Die
   Brief-Tokens selbst bleiben unveraendert.
