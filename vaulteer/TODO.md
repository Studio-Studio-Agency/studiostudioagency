# Offene Angaben vor dem Livegang

Sammelliste aus Teil 14 (Offene Angaben) des Content-Briefs plus dem, was bei der Umsetzung
dazugekommen ist. Jeder Punkt steht im Code als `[TODO: ...]` und faellt beim
Durchsehen der Seiten auf.

## Kontakt und Firma

Quelle: `vaulteer/src/config/site.ts`

- [ ] Strasse und Hausnummer
- [ ] PLZ Basel
- [ ] Telefonnummer
- [ ] E-Mail-Adresse — vorgesehen: kontakt@vaulteer.ch
- [ ] UID (CHE-...)
- [ ] Handelsregisternummer
- [ ] Vertretungsberechtigte Person

Bis diese Angaben vorliegen, laesst das JSON-LD die betroffenen Felder weg,
statt sie zu erfinden. Suchmaschinen uebernehmen strukturierte Daten als
Fakten — eine falsche Adresse dort ist schwerer zu korrigieren als eine
fehlende.

## Ueber uns

Quelle: `vaulteer/src/pages/ueber-uns.astro`

- [ ] Teammitglieder: Name, Funktion, ein Satz Hintergrund
- [ ] Portraetfotos (Slots `portrait-01` bis `portrait-04`)
- [ ] Karte: statisches Bild oder Link auf OpenStreetMap, kein eingebettetes iframe

## Rechtstexte

Quelle: `vaulteer/src/pages/{impressum,datenschutz,agb}.astro`

- [ ] Impressum — Pflichtangaben nach UWG Art. 3 Abs. 1 lit. s
- [ ] Datenschutzerklaerung — nach revDSG, **anwaltlich pruefen lassen**, kein
      Generator-Text
- [ ] AGB — **anwaltlich pruefen lassen**
- [ ] Auftragsbearbeitungsvertrag (AVV) als Download bereitstellen

Die drei Seiten stehen auf `noindex`, solange sie leer sind. Eine leere
Rechtsseite im Suchindex ist schlimmer als keine.

## Formular

Quelle: `vaulteer/src/pages/kontakt.astro`

- [ ] Formular-Endpunkt. Kein US-Dienst. Zwei souveraene Optionen stehen im
      README. Bis dahin traegt das Formular einen Platzhalter im `action` und
      daneben steht die E-Mail-Adresse als funktionierender Weg.

## Analytik

Quelle: `vaulteer/src/layouts/BaseLayout.astro`

- [ ] Selbstgehostetes Plausible oder Matomo. Als auskommentierter Platzhalter
      vorbereitet, bewusst nicht aktiv. Nach dem Einbau im Datenschutzhinweis
      sichtbar erwaehnen — laut Brief ist das ein Verkaufsargument.

## Bilder

Quelle: `vaulteer/IMAGE-BRIEF.md`, `vaulteer/src/config/images.ts`

- [ ] Alle 13 Slots. Bis dahin zeigen die Platzhalter den Bildauftrag an.
- [ ] Beim Einsetzen `aria-label="[TODO: Alt-Text]"` durch echten Alt-Text
      ersetzen.

## Inhalte

- [ ] Pillar-Artikel «Der CLOUD Act und Schweizer Unternehmen». Liegt als
      Entwurf mit Gliederung unter `src/content/wissen/cloud-act.mdx`,
      `draft: true`. Der Fliesstext wird redaktionell geschrieben.
- [ ] Beitrag «Cybersicherheit und Datensouveraenitaet sind zwei verschiedene
      Probleme». Redaktionsanweisung samt Zitierweise in `CONTENT-ROADMAP.md`.
      Die dort genannten Deloitte-Zahlen stammen aus dem Brief und gehoeren vor
      der Veroeffentlichung an der Medienmitteilung verifiziert.
- [ ] `topic` im Collection-Schema auf `z.enum([...])` umstellen, sobald die
      Themenliste feststeht.
- [ ] Branchenseiten Treuhand, Gesundheitswesen und Industrie: je ein
      `[TODO: Text ergänzen]` in der Ausgangslage, dazu die Abgrenzung bei
      Treuhand und Industrie. Der Brief liefert dort nur Stichpunkte.
- [ ] Fallbeispiele: noch keine vorhanden, Sektion bewusst nicht angelegt.

## Logo

- [ ] Logodatei. Bis dahin steht die Wortmarke in Helvetica 700 mit dem
      Signalquadrat. Gebraucht werden eine dunkle und eine helle Fassung —
      die Fusszeile und die Bildplatzhalter laufen auf Anthrazit.

## Vor dem Livegang

Siehe zusaetzlich die Checkliste in `vaulteer/DEPLOY.md`.
