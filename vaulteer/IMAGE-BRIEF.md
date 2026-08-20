# Bildauftrag

Es liegt noch kein Bildmaterial vor. Alle Bildflaechen sind mit
`<ImagePlaceholder />` besetzt. Die Platzhalter reservieren den Platz per
`aspect-ratio` — beim Einbau des echten Bildes entsteht **kein Layout-Shift**.

Die Tabelle unten und die Platzhalter im Layout speisen sich aus derselben
Quelle: `src/config/images.ts`. Wer einen Slot aendert, aendert ihn dort.

## Slots

| Slot-ID | Ort | Verhaeltnis | Zielgroesse | Bildauftrag |
|---|---|---|---|---|
| `hero-primary` | Startseite Hero | 16:10 | 2000 × 1250 | Serverraum oder Hardware, sachlich, kaltes Licht, kein Stock-Look. Alternativ Detailaufnahme eines Racks. Keine Personen. |
| `system-ui` | Startseite Loesung | 16:10 | 1600 × 1000 | Screenshot der tatsaechlichen Chat-Oberflaeche, anonymisiert. Ersetzt die Text-Behauptung durch den Beweis. |
| `office-basel` | Startseite Standort | 3:2 | 1600 × 1067 | Basel, Aussenaufnahme oder Arbeitsplatz. Ortsbezug erkennbar, keine Postkarte. |
| `portrait-01` … `portrait-04` | Ueber uns | 4:5 | 1200 × 1500 | Portraets, einheitliches Licht, neutraler Grund in `--paper-shade` (#F2F1EE), direkter Blick. |
| `sector-kanzlei` | Kanzleien | 3:1 | 2000 × 667 | Bandbild, abstrahiert. Akten, Bibliothek, Detail. |
| `sector-treuhand` | Treuhand | 3:1 | 2000 × 667 | Bandbild, abstrahiert. |
| `sector-gesundheit` | Gesundheit | 3:1 | 2000 × 667 | Bandbild, abstrahiert, ohne erkennbare Patienten. |
| `sector-industrie` | Industrie | 3:1 | 2000 × 667 | Bandbild, abstrahiert. |
| `article-teaser` | Wissensbeitraege | 16:9 | 1200 × 675 | Pro Beitrag ein abstraktes Diagramm oder eine Grafik. Keine Fotos. |
| `og-default` | Open Graph | 1.91:1 | 1200 × 630 | Anthrazit, Wortmarke, orange Quadrat. Als SVG angelegt. |

## Gestalterische Klammer

- Kaltes, hartes Licht. Keine warmen Filter, keine Bokeh-Weichzeichnung.
- Keine Stockfoto-Gesten: keine Haendeschuettler, keine Menschen vor
  Glaswaenden, keine schwebenden Datenwolken.
- Bei Portraets identische Brennweite, identischer Abstand, identischer Grund.
  Vier Bilder, die als Reihe funktionieren, nicht vier Einzelbilder.
- Die Bandbilder der Branchenseiten sind Abstraktionen, keine Illustrationen
  des Berufsstands. Detail statt Szene.
- Diagramme im Wissensbereich: `--ink` auf `--paper`, ein einziger Akzent in
  `--signal`. Dieselben zwei Schriftgewichte wie die Website.

## Einbau

`og-default` liegt bereits als `public/og-default.svg` vor.

> **Hinweis:** Die Website referenziert `og-default.png`, nicht das SVG.
> Facebook, LinkedIn, WhatsApp und X rendern keine SVG-Vorschaubilder. Das
> SVG ist die Gestaltungsquelle, das PNG die ausgelieferte Fassung. Nach jeder
> Aenderung am SVG neu exportieren (1200 × 630).

Fuer alle uebrigen Slots: Bild nach `src/assets/` legen und den Platzhalter
ersetzen. Das ist eine Zeile.

```astro
<!-- vorher -->
<ImagePlaceholder slotId="hero-primary" />

<!-- nachher -->
<Image src={heroPrimary} alt="…" widths={[800, 1200, 2000]} formats={['avif', 'webp']} />
```

Astro erzeugt AVIF mit WebP-Fallback und setzt `width`, `height` und
`loading="lazy"` selbst.

## Alt-Texte

Die Platzhalter tragen `aria-label="[TODO: Alt-Text]"`. Das ist Absicht: Sie
fallen dadurch in jedem Accessibility-Audit auf und koennen nicht unbemerkt
live gehen. Jeder Alt-Text wird beim Bildeinbau ausformuliert — er beschreibt,
was zu sehen ist, nicht was das Bild bedeuten soll. Rein dekorative Grafiken
bekommen `alt=""`.
