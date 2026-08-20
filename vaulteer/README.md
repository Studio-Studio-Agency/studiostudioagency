# Vaulteer — Website

Statische Website fuer die **Vaulteer GmbH**, Basel-Stadt. Lokale KI-Systeme
fuer Schweizer KMU, Beratung zu Datensouveraenitaet.

```sh
npm install
npm run dev      # Entwicklungsserver auf http://localhost:4321
npm run build    # statische Ausgabe nach dist/
npm run preview  # Ausgabe lokal pruefen
```

Deployment: siehe [DEPLOY.md](./DEPLOY.md). Bildauftraege: siehe
[IMAGE-BRIEF.md](./IMAGE-BRIEF.md).

---

## Offener Punkt: `content-brief.md` fehlt

Der Auftrag verweist auf eine Datei `content-brief.md` im Projektverzeichnis,
die Positionierung, Sitemap, saemtliche Texte, SEO-Angaben und die
Preisstruktur enthaelt. **Diese Datei liegt nicht im Repository** — weder im
Arbeitsverzeichnis noch in der Git-Historie.

Gebaut ist deshalb bisher Schritt 1 (Fundament), der ohne Inhalte auskommt.
Die Schritte 2 bis 8 haengen vollstaendig an dieser Datei. Sie werden
umgesetzt, sobald der Brief vorliegt. Erfundene Ersatztexte waeren hier das
falsche Mittel: Die Zielgruppe sind Anwaelte, Treuhaender und Aerzte, und
Sachbehauptungen zu Rechtslage, Preisen oder Leistungsumfang duerfen nicht aus
einem Sprachmodell stammen.

Alle Stellen, an denen Stammdaten fehlen, sind mit `[TODO: ...]` markiert und
zentral in `src/config/site.ts` gebuendelt.

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
   Node-Skript bei Infomaniak nimmt den POST entgegen und versendet per SMTP.
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
src/
  components/     Wordmark, Header, Footer, Button, Eyebrow,
                  SectionRule, ImagePlaceholder
  config/
    site.ts       Stammdaten und Navigation — hier stehen die [TODO]-Marken
    images.ts     Slot-Verzeichnis fuer das Platzhaltersystem
  content/        Wissensbereich (MDX), ab Schritt 6
  layouts/
    BaseLayout.astro   Rahmen, Meta, JSON-LD, Kopf- und Fusszeile
  pages/
  styles/
    global.css    Alle Tokens, die Typoskala, Raster, Buttons, Bewegung
public/
  favicon.svg, og-default.svg, og-default.png, robots.txt
```

`/styleguide` ist die interne Musterseite: alle Textstile, beide
Buttonvarianten, Farbtokens, Icons, Platzhalter und Raster. Sie steht auf
`noindex` und taucht nicht in der Navigation auf.

## Stand der Umsetzung

| Schritt | Umfang | Stand |
|---|---|---|
| 1 | Fundament: Rahmen, Tokens, Typoskala, Kopf, Fuss, Musterseite | fertig |
| 2 | Startseite | wartet auf `content-brief.md` |
| 3 | Leistungsseiten | wartet auf `content-brief.md` |
| 4 | Vorgehen und Preise | wartet auf `content-brief.md` |
| 5 | Branchenseiten | wartet auf `content-brief.md` |
| 6 | Wissensbereich | wartet auf `content-brief.md` |
| 7 | Ueber uns, Kontakt, Rechtliches, 404 | wartet auf `content-brief.md` |
| 8 | Sitemap, JSON-LD, Meta, Pruefung | teilweise: Sitemap, robots.txt und OG-Grundlage stehen |

## Qualitaetsziele

- Lighthouse mobil: Performance, Accessibility, Best Practices, SEO je >= 95
- Startseite ohne Bilder unter 100 KB — aktuell 9 KB HTML, 14 KB CSS, 0 KB JS
- vollstaendig tastaturbedienbar, Fokusring in `--signal` mit 2 px Offset
- semantisches HTML, Ueberschriftenhierarchie ohne Spruenge
- `lang="de-CH"`, Schweizer Orthografie, kein Eszett
- geprueft bei 320, 768, 1024, 1440 und 1920 px
