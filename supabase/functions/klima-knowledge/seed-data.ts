/**
 * Sample FAQ content for the Klimapartner Basel knowledge base.
 *
 * ⚠️  Placeholder copy written to be safely general ("in der Regel", ranges,
 * "abhängig von…"). The business MUST review and replace these entries with
 * verified figures and current cantonal rules before go-live — especially
 * Kosten, Förderung and Bewilligung.
 */

export interface KnowledgeEntry {
  title: string;
  content: string;
  category: string;
  lang?: string;
}

export const SEED_ENTRIES: KnowledgeEntry[] = [
  {
    title: "Was kostet eine Split-Klimaanlage inklusive Installation?",
    category: "kosten",
    content:
      "Die Kosten hängen stark von Gerät, Leitungswegen und baulichen Gegebenheiten ab. " +
      "Als grobe Orientierung: Ein einzelnes Split-Gerät für einen Raum liegt inklusive " +
      "fachgerechter Installation häufig im Bereich von einigen tausend Franken; " +
      "Multisplit-Lösungen für mehrere Räume entsprechend höher. Eine verlässliche Zahl " +
      "gibt es erst mit der Offerte des Installationspartners nach Besichtigung oder " +
      "anhand von Fotos und Grundrissen. Die Vermittlung und Offerte über Klimapartner " +
      "Basel ist kostenlos und unverbindlich.",
  },
  {
    title: "Brauche ich eine Bewilligung für eine Klimaanlage?",
    category: "bewilligung",
    content:
      "Je nach Kanton und Gebäude kann eine Bewilligungs- oder Meldepflicht bestehen, " +
      "insbesondere für das Aussengerät (Lärmschutz, Ortsbild, Denkmalschutz). In " +
      "Basel-Stadt und Basel-Landschaft gelten eigene kantonale Regeln, ebenso in Aargau " +
      "und Solothurn. Unsere Installationspartner kennen die lokalen Anforderungen und " +
      "unterstützen beim Bewilligungsverfahren — das klären wir im Rahmen der Offerte " +
      "verbindlich ab.",
  },
  {
    title: "Gibt es Förderung oder Subventionen?",
    category: "foerderung",
    content:
      "Förderprogramme betreffen in erster Linie effiziente Wärmepumpen-Lösungen und " +
      "unterscheiden sich je nach Kanton und Gemeinde; reine Komfortkühlung wird selten " +
      "gefördert. Moderne Split-Geräte können jedoch auch heizen und ersetzen in " +
      "gewissen Fällen fossile Heizlösungen — dann kann eine Förderung möglich sein. " +
      "Wir prüfen im Rahmen der Vermittlung, welche Programme für das konkrete Projekt " +
      "in Frage kommen.",
  },
  {
    title: "Ich bin Mieterin oder Mieter — darf ich eine Klimaanlage einbauen?",
    category: "ablauf",
    content:
      "Fest installierte Klimaanlagen erfordern die schriftliche Zustimmung der " +
      "Eigentümerschaft bzw. Verwaltung, da in die Bausubstanz eingegriffen wird " +
      "(Wanddurchbruch, Aussengerät). Wir empfehlen, die Zustimmung früh einzuholen — " +
      "gerne stellen wir Unterlagen bereit, die die Anfrage bei der Verwaltung " +
      "erleichtern. Alternativ gibt es Monoblock-Mietlösungen ohne Installation, die " +
      "aber deutlich weniger effizient und lauter sind.",
  },
  {
    title: "Wie läuft die Vermittlung über Klimapartner Basel ab?",
    category: "ablauf",
    content:
      "1. Sie schildern Ihr Vorhaben im Chat oder Gespräch — wir klären Bedarf, Objekt " +
      "und Zeithorizont. 2. Wir vermitteln Sie an einen geprüften, regionalen " +
      "Installationspartner. 3. Der Partner erstellt nach Besichtigung eine " +
      "unverbindliche Offerte. 4. Bei Zuschlag begleiten wir das Projekt bis zur " +
      "Inbetriebnahme. Für Kundinnen und Kunden ist die Vermittlung kostenlos.",
  },
  {
    title: "Wie laut ist eine Split-Klimaanlage?",
    category: "technik",
    content:
      "Moderne Innengeräte arbeiten im Flüsterbetrieb häufig im Bereich von etwa 19–30 " +
      "dB(A) — leiser als ein ruhiges Gespräch. Aussengeräte sind lauter und müssen die " +
      "Lärmschutzvorgaben am Aufstellort einhalten; die Platzierung (Abstand zu " +
      "Nachbarfenstern, Schallschutz) plant der Installationspartner ein.",
  },
  {
    title: "Kann eine Klimaanlage auch heizen?",
    category: "technik",
    content:
      "Ja. Praktisch alle modernen Split-Geräte sind Luft-Luft-Wärmepumpen und können " +
      "sehr effizient heizen — oft eine sinnvolle Ergänzung in der Übergangszeit oder " +
      "für einzelne Räume. Ob sich ein Gerät als vollwertiger Heizersatz eignet, hängt " +
      "vom Gebäude ab und wird in der Beratung geklärt.",
  },
  {
    title: "Wie viel Strom verbraucht eine Klimaanlage?",
    category: "technik",
    content:
      "Der Verbrauch hängt von Geräteeffizienz (SEER-Wert), Raumgrösse, Dämmung und " +
      "Nutzung ab. Als Faustregel: Ein effizientes Split-Gerät für einen Wohnraum " +
      "verursacht bei typischer sommerlicher Nutzung Stromkosten im Bereich von " +
      "einigen zehn bis wenigen hundert Franken pro Saison — deutlich weniger als " +
      "mobile Monoblock-Geräte bei gleicher Kühlleistung.",
  },
  {
    title: "Wie schnell ist ein Installationstermin möglich?",
    category: "ablauf",
    content:
      "Das hängt von der Saison ab: Im Hochsommer sind die Partner stark ausgelastet, " +
      "im Frühling und Herbst sind Termine meist deutlich schneller verfügbar. Die " +
      "Installation selbst dauert bei einem einzelnen Split-Gerät in der Regel etwa " +
      "einen Arbeitstag. Wer vor der Hitzewelle bereit sein will, plant idealerweise " +
      "früh im Jahr.",
  },
  {
    title: "Welche Regionen deckt Klimapartner Basel ab?",
    category: "ablauf",
    content:
      "Wir vermitteln Installationspartner in Basel-Stadt, Basel-Landschaft, Aargau und " +
      "Solothurn. Anfragen aus anderen Regionen nehmen wir gerne auf, können dort aber " +
      "keine Vermittlung zusichern.",
  },
  {
    title: "Braucht es einen Starkstromanschluss?",
    category: "technik",
    content:
      "Kleinere Split-Geräte kommen in der Regel mit einem normalen 230-V-Anschluss aus; " +
      "grössere Multisplit-Anlagen können einen 400-V-Anschluss benötigen. Ob die " +
      "vorhandene Elektroinstallation ausreicht, prüft der Installationspartner — " +
      "allfällige Elektroarbeiten werden in der Offerte ausgewiesen.",
  },
  {
    title: "Wie oft muss eine Klimaanlage gewartet werden?",
    category: "technik",
    content:
      "Empfohlen wird eine Wartung etwa alle ein bis zwei Jahre (Filterreinigung, " +
      "Dichtheitskontrolle, Funktionsprüfung); Filter können Sie selbst regelmässig " +
      "reinigen. Ab einer gewissen Kältemittelmenge ist eine periodische " +
      "Dichtheitskontrolle gesetzlich vorgeschrieben — Details klärt der " +
      "Installationspartner anhand des gewählten Geräts.",
  },
];
