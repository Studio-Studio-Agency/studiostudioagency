# TV Board Watcher

Lokale App für den Mac, die automatisch nach dem Mainboard des Sony KD-65AF9 (EU,
1-983-356-11 und Varianten) sucht – Kauf, Reparaturservice, Teilespender – und neue
Treffer per Push (ntfy/Telegram) und täglicher E-Mail meldet. Läuft im Hintergrund
über launchd, Weboberfläche unter http://127.0.0.1:8765.

## Status – bitte zuerst lesen

Der Code wurde in einer Umgebung ohne Zugang zu den Marktplätzen gebaut. Getestet sind:

- Klassifizierung (29 Unit-Tests, inkl. deiner 5 Beispiele), Datenbank, Duplikaterkennung,
  Preis-Parsing, Weboberfläche, Scheduler-Logik, Shop-Parser, Playwright-Extraktion
  gegen lokale HTML-Fixtures.

**Nicht** gegen echte Seiten getestet: die CSS-Selektoren der Browser-Plattformen
(`watcher/platforms/browser_specs.py`) und die Shop-Such-URLs in `config.yaml`. Beides
ist nach bestem Wissen gesetzt, muss aber beim ersten Lauf auf dem Mac verifiziert
werden (Abschnitt "Erster Lauf"). Plattformen, die 0 Treffer liefern, obwohl manuell
welche sichtbar sind, brauchen eine Selektor-Korrektur – das ist pro Plattform ein
Eintrag von 10 Zeilen.

## Plan: Welche Plattform wie

| Plattform | Modus | Anmerkung |
|---|---|---|
| eBay .de .ch .at .fr .it .es .nl .be .pl .co.uk .com | **API** (Browse API) | Ein Schlüsselpaar für alle Marktplätze, offiziell erlaubt, 5000 Calls/Tag frei. Sucht auch in Beschreibungen. |
| Allegro.pl | **API** (REST, Client Credentials) | Offiziell, kostenlos. |
| Allegro Lokalnie, Allegro.hu | Browser | Kein API-Marktplatz. |
| Kleinanzeigen.de | Browser | Nutzungsbedingungen untersagen automatisierte Abfragen; robots.txt wird zur Laufzeit geprüft. **Empfohlene Alternative:** Kleinanzeigen-Suchauftrag mit Push/E-Mail (Suche ausführen → "Suchauftrag speichern"). |
| willhaben.at | Browser | ToS untersagen Scraping. Alternative: "Suchagent" (Suche speichern, E-Mail/Push). |
| Ricardo.ch | Browser | ToS untersagen automatisierten Zugriff. Alternative: Suchabo ("Suche speichern", E-Mail). |
| Tutti.ch, Anibis.ch | Browser | Gleiche Lage. Beide bieten gespeicherte Suche mit E-Mail-Alarm. |
| Leboncoin.fr | Browser | Starker Bot-Schutz (DataDome). Blockiert sehr wahrscheinlich → wird protokolliert und gemeldet. **Praktisch: "Sauvegarder la recherche" mit Benachrichtigung nutzen.** |
| Subito.it | Browser | Alternative: "Salva ricerca". |
| Wallapop.es | Browser | SPA, Bot-Schutz. Alternative: App-Benachrichtigung für gespeicherte Suche. |
| Marktplaats.nl, 2dehands.be | Browser | Gleiche Technik. Alternative: "Zoekopdracht opslaan". |
| OLX.pl | Browser | Alternative: "Obserwuj wyszukiwanie". |
| Jófogás.hu | Browser | Alternative: "Keresés mentése". |
| Ersatzteilshops (9 Shops) | HTTP ohne Browser | Kleine Shops, 1 Anfrage pro Teilenummer alle 2–4 h. |
| Websuche | **API** (Brave Search, Free-Plan) | Ohne Schlüssel Fallback DuckDuckGo-HTML (unzuverlässig). |
| Amazon (.de .fr .it .co.uk) | **manuell** | ToS verbieten automatisierte Abfragen, keine offene Such-API (PA-API nur für Affiliates mit Umsatz). Standardmässig aus. Alternative: Amazon-Suche nach "1-983-356-11" als Lesezeichen; Angebote für dieses Board sind dort selten. |
| AliExpress | **manuell** | Login-/Captcha-Wall, ToS. Standardmässig aus. Alternative: App-Suche + "Wunschliste"-Benachrichtigung. |

Verhalten bei Blockade: Captcha, 403/429, Login-Umleitung oder robots.txt-Verbot →
Lauf abgebrochen, Status `blocked`/`robots` in der Oberfläche, nach 3 Fehlern in Folge
eine Push-Meldung. Es wird nichts umgangen. Zwischen Abfragen derselben Plattform
liegen 2–4 h (zufällig), zwischen Suchbegriffen 8–25 s.

Zur Rechtslage: Bei Portalen, deren AGB automatisierte Abfragen untersagen, ist das
Abfragen mit eigenem Browser in dieser Frequenz praktisch ein Lesezugriff wie von Hand,
aber formal ein AGB-Verstoss (mögliche Folge: Kontosperre, IP-Block). Das ist deine
Entscheidung; du kannst jede Plattform in `config.yaml` mit `enabled: false` abschalten
und stattdessen die plattformeigene gespeicherte Suche nutzen. Für Leboncoin und
Wallapop empfehle ich das von Anfang an.

## Installation (macOS)

Voraussetzung: Python 3.11+ (`brew install python`).

```bash
cd tv-board-watcher
./scripts/install.sh
```

Das Skript legt `.venv` an, installiert Abhängigkeiten und Chromium, erzeugt `.env`
aus `.env.example` und registriert den launchd-Dienst `com.alainsz.tvboardwatcher`
(startet beim Login, läuft dauerhaft, wird bei Absturz neu gestartet).

Danach `.env` ausfüllen (Schlüssel, siehe unten) und den Dienst neu starten.

## Schlüssel beschaffen

**eBay Browse API** (wichtigste Quelle)
1. https://developer.ebay.com → "Register" (kostenlos, normales eBay-Konto reicht).
2. "Application Keys" → unter **Production** "Create a keyset". Für Browse API ist
   keine Freischaltung nötig.
3. `App ID (Client ID)` → `EBAY_CLIENT_ID`, `Cert ID (Client Secret)` → `EBAY_CLIENT_SECRET`.

**Allegro REST API**
1. https://apps.developer.allegro.pl → mit Allegro-Konto anmelden → "Zarejestruj nową aplikację".
2. Typ "Device" oder "Web", Redirect-URI egal (wird nicht gebraucht).
3. `Client ID` / `Client Secret` → `ALLEGRO_CLIENT_ID` / `ALLEGRO_CLIENT_SECRET`.

**Brave Search API** (Websuche, optional)
1. https://api.search.brave.com → Konto → Plan "Free" (2000 Abfragen/Monat, Kreditkarte
   zur Verifikation nötig, keine Belastung).
2. API-Key → `BRAVE_API_KEY`. Ohne Key wird DuckDuckGo-HTML benutzt.

**Push aufs iPhone – ntfy (empfohlen, 2 Minuten)**
1. App "ntfy" aus dem App Store installieren.
2. In der App "+" → Topic abonnieren, z.B. `tvboard-7f3k9x2m` (lang und zufällig, das
   Topic ist das Passwort).
3. Gleichen Namen in `.env` als `NTFY_TOPIC` eintragen.
4. Testen: `.venv/bin/python -m watcher test-notify`

**Push – Telegram (Alternative)**
1. In Telegram mit `@BotFather` sprechen → `/newbot` → Token → `TELEGRAM_BOT_TOKEN`.
2. Deinem Bot eine Nachricht schreiben, dann `https://api.telegram.org/bot<TOKEN>/getUpdates`
   öffnen; `chat.id` → `TELEGRAM_CHAT_ID`.
3. In `config.yaml`: `notify.telegram.enabled: true`.

**E-Mail-Zusammenfassung**
`notify.email` in `config.yaml` aktivieren, SMTP-Host/Port/Absender eintragen,
`SMTP_USER`/`SMTP_PASSWORD` in `.env`. Versand täglich um `schedule.daily_summary_time`.

## Erster Lauf (Verifikation)

```bash
cd tv-board-watcher
.venv/bin/python -m watcher platforms           # was ist aktiv
.venv/bin/python -m watcher once ebay allegro   # API-Plattformen einmal abfragen
.venv/bin/python -m watcher once kleinanzeigen ricardo
.venv/bin/python -m watcher once                # alles (dauert wegen Pausen ~20 Min)
```

Jede Zeile zeigt `ok / blocked / robots / error` mit Trefferzahl. Dann
http://127.0.0.1:8765 öffnen (`python -m watcher web`, falls der Dienst nicht läuft).
Liefert eine Browser-Plattform `ok, 0 Treffer`, obwohl du im Browser welche siehst:
in `watcher/platforms/browser_specs.py` die Selektoren dieser Plattform anpassen
(Rechtsklick auf eine Anzeige in der Trefferliste → Element untersuchen).
Zum Debuggen `behaviour.headless: false` setzen, dann siehst du den Browser.

## Start, Stopp, Status, Logs

```bash
# Status
launchctl print gui/$(id -u)/com.alainsz.tvboardwatcher | head -20

# Stopp (bis zum nächsten Login) / Start
launchctl bootout gui/$(id -u)/com.alainsz.tvboardwatcher
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.alainsz.tvboardwatcher.plist

# Neustart nach Konfigurationsänderung
launchctl kickstart -k gui/$(id -u)/com.alainsz.tvboardwatcher

# Dienst dauerhaft entfernen (Daten bleiben)
./scripts/uninstall.sh

# Logs
tail -f logs/watcher.log          # Anwendung
tail -f logs/launchd.err.log      # Startprobleme
```

Im Vordergrund (zum Testen): `.venv/bin/python -m watcher`

## Konfiguration ändern

Alles steht in **`config.yaml`** (kommentiert): Suchbegriffe, Board-Wörter pro Sprache,
Intervalle, Plattformen an/aus, Shop-Liste, Benachrichtigung, Preisgrenze. Geheimnisse
in `.env`. Nach Änderung: `launchctl kickstart -k …` (siehe oben).

Datenbank: `data/watcher.sqlite` (Tabellen `hits`, `platform_state`, `runs`, `fx_rates`).
Löschen setzt alles zurück – bereits gemeldete Treffer würden dann erneut gemeldet.

## Plattform hinzufügen

- **Kleinanzeigen-Portal:** neuen `BrowserSpec` in `watcher/platforms/browser_specs.py`
  (Such-URL mit `{q}`, Selektoren für Anzeige/Titel/Link/Preis/Ort) und in `config.yaml`
  unter `platforms` eintragen (`enabled: true, mode: browser`).
- **Shop:** Zeile in `config.yaml` → `platforms.shops.list` (`url` mit `{q}`). Shopify,
  WooCommerce, PrestaShop, Shopware, Magento werden automatisch erkannt.
- **API-Plattform:** Klasse von `Platform` ableiten (Vorlage `ebay_api.py`), in
  `watcher/platforms/__init__.py` → `CODE_PLATFORMS` registrieren.

## Klassifizierung

Reihenfolge: SUCHE → FALSCH → REPARATUR → TEILESPENDER → KAUF → UNKLAR.
Regeln und Wortlisten in `watcher/classify.py`. Testen:

```bash
.venv/bin/python -m watcher classify "Carte Mère Sony KD-65AF9 (1-983-356-11)"
.venv/bin/python -m pytest -q
```

FALSCH greift nur, wenn keine unserer Teilenummern genannt wird – ein Angebot mit
"1-983-356-11, passt auch XBR-65A9F" bleibt KAUF. UNKLAR wird angezeigt, aber nicht
gepusht. SUCHE und FALSCH sind ausgeblendet (Oberfläche: "Ausgeblendete zeigen").

## Grenzen

- Browser-Selektoren altern; wenn eine Plattform wochenlang 0 Treffer liefert, prüfen.
- CHF-Kurse: EZB-Tageskurs via frankfurter.app, einmal täglich; bei Ausfall letzter Kurs.
- Kein Login auf keiner Plattform – Angebote, die nur eingeloggt sichtbar sind, fehlen.
- Der Mac muss laufen (kein Ruhezustand), sonst pausiert die Suche.
