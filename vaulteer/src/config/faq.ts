/**
 * FAQ aus Teil 13 des Briefs. Woertlich uebernommen.
 * Wird auf Startseite und Leistungsseiten eingesetzt und speist das
 * FAQPage-JSON-LD — beides aus dieser einen Quelle, damit sichtbarer Text und
 * strukturierte Daten nie auseinanderlaufen.
 */
export type FaqItem = { question: string; answer: string };

export const faq: FaqItem[] = [
  {
    question: 'Ist ein lokales Modell schlechter als ChatGPT?',
    answer:
      'Bei einzelnen anspruchsvollen Aufgaben ja, bei der grossen Mehrheit alltäglicher Büroarbeit nein. Wir testen vor dem Projekt mit Ihren realen Dokumenten, damit Sie es nicht glauben müssen.',
  },
  {
    question: 'Wie lange dauert es bis zum laufenden System?',
    answer:
      'Von der Beauftragung bis zum produktiven Betrieb typischerweise sechs bis zehn Wochen, abhängig von der Hardware-Beschaffung und der Anzahl anzubindender Datenquellen.',
  },
  {
    question: 'Brauchen wir einen eigenen Serverraum?',
    answer:
      'Nein. In den meisten Fällen empfehlen wir einen exklusiv zugeteilten Server in einem Schweizer Rechenzentrum. Das ist günstiger und betrieblich sicherer als ein Gerät im Büroschrank.',
  },
  {
    question: 'Was passiert, wenn es Vaulteer nicht mehr gibt?',
    answer:
      'Wir setzen offene Komponenten ein und dokumentieren die Architektur so, dass ein anderer Dienstleister übernehmen kann. Sie erhalten alle Zugänge und die vollständige Dokumentation. Das System läuft weiter, auch ohne uns.',
  },
  {
    question: 'Werden unsere Daten zum Training verwendet?',
    answer:
      'Nein. Weder von uns noch von einem Dritten. Das System lernt nicht aus Ihren Eingaben, es greift auf Ihre Dokumente zu. Das ist ein technischer Unterschied, den wir Ihnen gerne erklären.',
  },
  {
    question: 'Können wir das nicht selbst machen?',
    answer:
      'Technisch ja, wenn Sie jemanden mit dem entsprechenden Wissen im Haus haben. Der Aufwand liegt weniger im Aufstellen als im Betrieb: Berechtigungen, Sicherung, Aktualisierungen, Modellwechsel, Schulung. Wenn Sie das selbst tragen wollen, beraten wir Sie auch nur beim Aufbau.',
  },
  {
    question: 'Arbeitet ihr auch mit unserem bestehenden IT-Dienstleister zusammen?',
    answer:
      'Ja, das ist der Normalfall. Wir übernehmen die KI-Komponente, Ihr Partner behält die IT-Betreuung.',
  },
  {
    question: 'Was kostet der Einstieg?',
    answer:
      'Das Erstgespräch ist kostenlos. Das Assessment beginnt bei CHF 4’800. Richtwerte für die Umsetzung finden Sie auf der Seite Vorgehen und Preise.',
  },
];
