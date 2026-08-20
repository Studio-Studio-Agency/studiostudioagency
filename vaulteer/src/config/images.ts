/**
 * Slot-Verzeichnis fuer das Bild-Platzhalter-System.
 * Eine Aenderung hier wirkt gleichzeitig auf die Platzhalter im Layout und
 * auf IMAGE-BRIEF.md — beides speist sich aus dieser Tabelle.
 *
 * Wenn ein echtes Bild vorliegt: `src` setzen (Import aus src/assets/) und
 * `alt` ausformulieren. Die Komponente rendert dann Astros <Image /> statt
 * des Bauplans. Das Layout aendert sich dabei nicht, weil das
 * Seitenverhaeltnis bereits reserviert ist.
 */

export type ImageSlot = {
  id: string;
  place: string;
  ratio: string;      // CSS aspect-ratio, z. B. '16 / 10'
  ratioLabel: string; // Anzeige, z. B. '16:10'
  size: string;       // Zielgroesse in Pixel
  brief: string;      // Bildauftrag
};

export const imageSlots = {
  'hero-primary': {
    id: 'hero-primary',
    place: 'Startseite Hero',
    ratio: '16 / 10',
    ratioLabel: '16:10',
    size: '2000 × 1250',
    brief:
      'Serverraum oder Hardware, sachlich, kaltes Licht, kein Stock-Look. Alternativ: Detailaufnahme eines Racks. Keine Personen.',
  },
  'system-ui': {
    id: 'system-ui',
    place: 'Startseite Loesung',
    ratio: '16 / 10',
    ratioLabel: '16:10',
    size: '1600 × 1000',
    brief:
      'Screenshot der tatsaechlichen Chat-Oberflaeche, anonymisiert. Ersetzt spaeter Text-Behauptung durch Beweis.',
  },
  'office-basel': {
    id: 'office-basel',
    place: 'Startseite Standort',
    ratio: '3 / 2',
    ratioLabel: '3:2',
    size: '1600 × 1067',
    brief: 'Basel, Aussenaufnahme oder Arbeitsplatz. Ortsbezug erkennbar, keine Postkarte.',
  },
  'portrait-01': {
    id: 'portrait-01',
    place: 'Ueber uns',
    ratio: '4 / 5',
    ratioLabel: '4:5',
    size: '1200 × 1500',
    brief: 'Portraet, einheitliches Licht, neutraler Grund in --paper-shade, direkter Blick.',
  },
  'portrait-02': {
    id: 'portrait-02',
    place: 'Ueber uns',
    ratio: '4 / 5',
    ratioLabel: '4:5',
    size: '1200 × 1500',
    brief: 'Portraet, einheitliches Licht, neutraler Grund in --paper-shade, direkter Blick.',
  },
  'portrait-03': {
    id: 'portrait-03',
    place: 'Ueber uns',
    ratio: '4 / 5',
    ratioLabel: '4:5',
    size: '1200 × 1500',
    brief: 'Portraet, einheitliches Licht, neutraler Grund in --paper-shade, direkter Blick.',
  },
  'portrait-04': {
    id: 'portrait-04',
    place: 'Ueber uns',
    ratio: '4 / 5',
    ratioLabel: '4:5',
    size: '1200 × 1500',
    brief: 'Portraet, einheitliches Licht, neutraler Grund in --paper-shade, direkter Blick.',
  },
  'sector-kanzlei': {
    id: 'sector-kanzlei',
    place: 'Branchenseite Kanzleien',
    ratio: '3 / 1',
    ratioLabel: '3:1',
    size: '2000 × 667',
    brief: 'Bandbild, abstrahiert. Akten, Bibliothek, Detail.',
  },
  'sector-treuhand': {
    id: 'sector-treuhand',
    place: 'Branchenseite Treuhand',
    ratio: '3 / 1',
    ratioLabel: '3:1',
    size: '2000 × 667',
    brief: 'Bandbild, abstrahiert.',
  },
  'sector-gesundheit': {
    id: 'sector-gesundheit',
    place: 'Branchenseite Gesundheit',
    ratio: '3 / 1',
    ratioLabel: '3:1',
    size: '2000 × 667',
    brief: 'Bandbild, abstrahiert, ohne erkennbare Patienten.',
  },
  'sector-industrie': {
    id: 'sector-industrie',
    place: 'Branchenseite Industrie',
    ratio: '3 / 1',
    ratioLabel: '3:1',
    size: '2000 × 667',
    brief: 'Bandbild, abstrahiert.',
  },
  'article-teaser': {
    id: 'article-teaser',
    place: 'Wissensbeitraege',
    ratio: '16 / 9',
    ratioLabel: '16:9',
    size: '1200 × 675',
    brief: 'Pro Beitrag ein abstraktes Diagramm oder eine Grafik. Keine Fotos.',
  },
  'og-default': {
    id: 'og-default',
    place: 'Open Graph',
    ratio: '1.91 / 1',
    ratioLabel: '1.91:1',
    size: '1200 × 630',
    brief: 'Anthrazit, Wortmarke, orange Quadrat. Als SVG anlegen, nicht als Foto.',
  },
} as const satisfies Record<string, ImageSlot>;

export type ImageSlotId = keyof typeof imageSlots;
