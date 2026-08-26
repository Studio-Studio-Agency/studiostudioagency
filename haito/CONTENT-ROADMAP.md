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

**Kernbefunde, gegengeprueft (Stand 21. August 2026):**

| Befund | Wert | Status |
|---|---|---|
| Berichten von einem ernsten Cybervorfall innert drei Monaten | 49 % | bestaetigt |
| Halten das eigene Risiko fuer hoch | 22 % | bestaetigt |
| KMU-Cybersicherheitsindex | 58 von 100 | bestaetigt |
| **Multi**-Faktor-Authentifizierung im Einsatz | 66 % | **korrigiert, siehe unten** |
| Single Sign-On im Einsatz | 45 % | bestaetigt, **unvollstaendig zitiert** |
| Passwortlose Authentifizierung im Einsatz | 45 % | im Brief nicht erwaehnt |
| Cyberversicherung (Schweizer Unternehmen, 2025, Quelle SVV) | 11,5 % | im Brief nicht erwaehnt |

Erhebung: April 2026, 924 Arbeitnehmende in Unternehmen mit bis zu 250
Mitarbeitenden. Veroeffentlichung 20. August 2026.

**Zwei Korrekturen gegenueber der Formulierung im Brief.** Beide betreffen
genau die Zahlen, auf denen das Argument des Beitrags ruht:

1. Der Brief schreibt «Zwei-Faktor-Anmeldung bei 66 Prozent». Erhoben wurde
   **Multi**-Faktor-Authentifizierung. Zwei-Faktor ist ein Sonderfall davon;
   die Verengung gibt die Quelle falsch wieder. Im Beitrag gehoert der Begriff
   der Studie verwendet.
2. Der Brief schreibt «zentrales Anmeldeverfahren bei 45 Prozent». Das stimmt
   fuer Single Sign-On — aber passwortlose Authentifizierung liegt **ebenfalls**
   bei 45 Prozent. So wie es im Brief steht, wirkt der Wert exklusiv fuer SSO.

Der Titel der Studie nennt drei Befunde; der dritte, die Unterversicherung
(11,5 Prozent), fehlt im Brief ganz. Fuer die Abgrenzungsthese des Beitrags ist
er nicht noetig, aber wer die Studie zitiert, sollte wissen, dass er existiert.

> **Wie geprueft wurde, und was das wert ist.** Die Angaben stammen aus zwei
> unabhaengigen Websuchen, die uebereinstimmen. Die Medienmitteilung von
> Deloitte selbst war nicht abrufbar — der Netzwerk-Proxy dieser
> Arbeitsumgebung laesst deloitte.com nicht durch. Das ist eine Bestaetigung
> aus zweiter Hand, keine aus der Primaerquelle. Vor der Veroeffentlichung
> gehoert jede Zahl an der Medienmitteilung selbst nachgeschlagen, und dorthin
> gehoert auch der Link — nicht auf eine Newsseite.

**Beruehrungspunkt zur Website:** Der Befund zum zentralen Anmeldeverfahren
(45 %) deckt sich mit der Formulierung auf `/leistungen/local-ai`: ein zentrales
Anmeldeverfahren ist in Schweizer KMU keineswegs Standard, weshalb Haito die
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
