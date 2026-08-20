# Wissensbereich — Redaktionsplan

Quelle: Content-Brief, Teil 10 (Wissensbereich). Ein fundierter Beitrag pro
Monat schlaegt vier oberflaechliche. Bei dieser Zielgruppe ist die Textqualitaet
selbst der Kompetenznachweis.

**Angelegt ist bisher nur der Pillar-Artikel**, als Entwurf mit Gliederung und
ohne Fliesstext (`src/content/wissen/cloud-act.mdx`, `draft: true`). Teil 14 des
Briefs sieht ausdruecklich nur diesen einen Entwurf vor. Die uebrigen Beitraege
stehen hier als Auftrag, nicht als Datei — erfundener Fliesstext waere bei
diesem Bereich das Gegenteil des Ziels.

---

## Pillar-Artikel (zuerst)

**«Der CLOUD Act und Schweizer Unternehmen — was gilt, was nicht, was zu tun ist»**
2500–4000 Woerter. Suchmaschinen-Fundament. Soll die beste deutschsprachige
Quelle zum Thema fuer Schweizer KMU sein. Sachlich, mit Quellenangaben, ohne
Verkaufsargumentation. Am Ende ein dezenter Hinweis auf das Assessment.

Status: Entwurf mit Strukturueberschriften liegt vor.

---

## 1. Cybersicherheit und Datensouveraenitaet sind zwei verschiedene Probleme

Der naechste zu schreibende Beitrag.

**Aufhaenger:** Deloitte-Studie «Unterschaetzt, ungeschuetzt, unterversichert:
KMU-Cyberrisiken in der Schweiz» vom 20. August 2026.

**Kernbefunde laut Brief:**

| Befund | Wert |
|---|---|
| Berichten von einem ernsten Cybervorfall in den letzten drei Monaten | 49 % |
| Halten das eigene Risiko fuer hoch | 22 % |
| Cybersicherheitsindex | 58 von 100 |
| Zwei-Faktor-Anmeldung im Einsatz | 66 % |
| Zentrales Anmeldeverfahren im Einsatz | 45 % |

**These des Beitrags:** Diese Zahlen beschreiben ein Abwehrproblem — jemand von
aussen will hinein. Datensouveraenitaet beschreibt etwas anderes — Daten gehen
freiwillig nach draussen, durch die Vordertuer, mit Zustimmung der
Nutzungsbedingungen. Beide Probleme brauchen unterschiedliche Antworten, und
eine geloeste Firewall-Frage sagt nichts darueber aus, wo die Mandantendaten am
Freitagabend gelandet sind.

**Warum zuerst:** Verhindert, dass Vaulteer mit IT-Sicherheitsanbietern
verwechselt wird, und greift ein Thema auf, das gerade Aufmerksamkeit hat.

**Der Beitrag darf die Studie nicht als Bedrohungsargument benutzen, sondern
zieht eine Grenze.** Teil 15 des Briefs verbietet Datenleck-Statistiken als
Aufhaenger; die Ausnahme traegt genau so weit, wie die Zahlen der Abgrenzung
dienen und nicht der Angst.

**Zitierweise, verbindlich:**

- Deloitte als Urheber nennen
- Erhebungszeitpunkt April 2026
- Stichprobe 924 Arbeitnehmende in Betrieben bis 250 Mitarbeitende
- Auf die Medienmitteilung von Deloitte verlinken, nicht auf eine Newsseite
- Methodische Einschraenkung offen benennen: befragt wurden Angestellte, nicht
  IT-Verantwortliche, weshalb die Vorfallszahl Wahrnehmung abbildet und keine
  Incident-Statistik ist. **Diese Offenheit ist der eigentliche
  Kompetenznachweis des Beitrags.**

> **Vor dem Schreiben pruefen:** Die Zahlen oben stammen aus dem Brief, nicht
> aus der Primaerquelle. Die Studie traegt das Datum 20. August 2026 und ist
> damit taggleich mit der Brief-Aktualisierung. Alle fuenf Werte, das
> Erhebungsdatum und die Stichprobengroesse gehoeren vor der Veroeffentlichung
> an der Medienmitteilung selbst verifiziert. Ein Beitrag, der methodische
> Sorgfalt zum Argument macht, darf sich seine Zahlen nicht aus zweiter Hand
> holen.

**Beruehrungspunkt zur Website:** Der Befund zum zentralen Anmeldeverfahren
(45 %) deckt sich mit der Formulierung auf `/leistungen/local-ai`: ein zentrales
Anmeldeverfahren ist in Schweizer KMU keineswegs Standard, weshalb Vaulteer die
Benutzerverwaltung mit einrichtet, statt sie vorauszusetzen.

---

## Weitere Beitraege, Reihenfolge nach Nutzen

2. Was kostet ein lokales KI-System wirklich — Rechnung ueber drei Jahre, offen
   kalkuliert
3. Lokal, Schweizer Cloud oder internationale Cloud — eine Entscheidungshilfe
   nach Datenkategorie
4. KI-Nutzungsrichtlinie: Muster zum Herunterladen
   *(bestes Lead-Magnet-Format fuer diese Zielgruppe)*
5. Welche Hardware fuer welche Teamgroesse — konkrete Konfigurationen mit Preisen
6. Berufsgeheimnis und KI: Was Art. 321 StGB fuer Kanzleien und Praxen bedeutet
7. Shadow AI im Betrieb erkennen — ohne Ueberwachung der Mitarbeitenden
8. Offene Sprachmodelle: Wie wir auswaehlen und woran wir messen
9. revDSG und KI-Einsatz: die Pflichten in der Praxis

---

## Wie ein Beitrag angelegt wird

```sh
# src/content/wissen/<slug>.mdx
---
title: '...'          # max. 70 Zeichen
description: '...'    # max. 160 Zeichen
publishDate: 2026-00-00
topic: '...'
readingTime: 0        # Minuten
draft: true           # bis zur Freigabe
---
```

`draft: true` haelt den Beitrag aus Uebersicht, Sitemap und Suchindex heraus;
ueber den Direktlink bleibt er zum Gegenlesen erreichbar. Ab vier
`##`-Abschnitten blendet die Vorlage automatisch ein Inhaltsverzeichnis ein.

Offen: `topic` ist im Schema noch eine freie Zeichenkette. Sobald die
Themenliste feststeht, gehoert sie als `z.enum([...])` verdrahtet — sonst
entstehen Dubletten wie «Datenschutz» und «Datenschutz & DSG».
