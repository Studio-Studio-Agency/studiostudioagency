# Deployment

Die Website ist statisch. Es gibt keinen Server, keine Datenbank, keinen
Build-Schritt beim Hoster.

## Zwei Ziele

Die Seite laeuft zuerst als Vorschau in einem Unterverzeichnis, spaeter unter
einer eigenen Domain. Beides ist derselbe Code, unterschieden nur ueber drei
Umgebungsvariablen.

| | Vorschau | Kundenabnahme | Live |
|---|---|---|---|
| Adresse | `dev.studiostudio.ch/vaulteer` | `vaulteer.studiostudio.ch` | `vaulteer.ch` |
| `SITE_URL` | `https://dev.studiostudio.ch` | `https://vaulteer.studiostudio.ch` | `https://vaulteer.ch` |
| `BASE_PATH` | `/vaulteer` | `/` | `/` |
| `SITE_INDEXABLE` | nicht gesetzt | **nicht gesetzt** | `true` |
| Suchindex | gesperrt | gesperrt | freigegeben |
| Befehl | `npm run build` | `npm run build:studiostudio` | `npm run build:live` |

**Warum die Kundenabnahme nicht indexiert wird.** Die gesamte SEO-Planung im
Brief zielt auf `vaulteer.ch`. Kaeme `vaulteer.studiostudio.ch` zuerst in den
Index, muesste die eigene Domain spaeter gegen ihre eigenen Inhalte antreten —
Google sieht zwei Adressen mit identischem Text und entscheidet selbst, welche
zaehlt. Wer das aufloesen will, braucht danach Weiterleitungen und Geduld.
Solange die Adresse der Abnahme dient und nicht der Bewerbung, bleibt sie
gesperrt. Soll sie doch gefunden werden, genuegt `SITE_INDEXABLE=true` — dann
aber bewusst und mit dem Wissen, was es kostet.

Die Vorschau ist die Voreinstellung. Wer nichts setzt, baut die Vorschau —
und riskiert damit nicht versehentlich einen indexierten Zwischenstand.

## Build

```sh
npm ci
npm run build        # Vorschau: dev.studiostudio.ch/vaulteer
npm run build:live   # Live: vaulteer.ch
```

Ergebnis: **`dist/`**. Der *Inhalt* dieses Verzeichnisses wird hochgeladen,
nicht der Ordner selbst.

Vorher lokal pruefen:

```sh
npm run preview   # http://localhost:4321/vaulteer
```

Alle internen Links laufen ueber `withBase()` aus `src/config/site.ts`. Ein
nacktes `href="/leistungen"` bricht in der Vorschau — im Code deshalb immer
`href={withBase('/leistungen')}`.

## Hosting

**Der Hoster ist noch nicht gewaehlt.** Der Brief nennt «einen Schweizer
Hoster (Infomaniak oder aehnlich)» — das ist eine Richtung, keine
Entscheidung. Diese Anleitung ist deshalb anbieterneutral.

Anforderungen an den Hoster, mehr braucht es nicht:

- statisches Webhosting, kein Node.js auf dem Server
- eigene Domain mit HTTPS
- Zugang per SFTP oder rsync
- eigene Fehlerseite und eigene Header konfigurierbar (`.htaccess` oder Panel)
- Serverstandort Schweiz, Betreiber dem Schweizer Recht unterstellt

Der letzte Punkt ist der einzige, der wirklich Auswahl bedeutet. Er gehoert
beim jeweiligen Anbieter geprueft, nicht hier behauptet.

Bewusst **nicht** eingerichtet sind Vercel und Netlify. Beides sind
US-Anbieter, deren Nutzung dem Produktversprechen des Auftraggebers
widerspricht — die Website eines Anbieters von Datensouveraenitaet sollte
nicht in einem US-CDN liegen.

### Upload

**Vorschau** — in das Unterverzeichnis `vaulteer/` des Web-Wurzelverzeichnisses
von `dev.studiostudio.ch`:

```sh
npm run build
rsync -avz --delete dist/ BENUTZER@HOST:PFAD_ZUR_DOMAIN/vaulteer/
```

**Live** — in das Web-Wurzelverzeichnis der eigenen Domain:

```sh
npm run build:live
rsync -avz --delete dist/ BENUTZER@HOST:PFAD_ZUM_WURZELVERZEICHNIS/
```

Den genauen Zielpfad nennt die Verwaltung des Hosters. `--delete` raeumt
Dateien weg, die im Build nicht mehr vorkommen — auf dem Vorschau-Host
betrifft das nur `vaulteer/`, weil rsync nur dieses Verzeichnis anfasst.
Alternativ ueber den Dateimanager oder FTP.

### Automatisch hochladen (empfohlen)

`.github/workflows/deploy-vaulteer.yml` laedt per GitHub Actions hoch. Bewusst
nur von Hand ausloesbar (Actions → «Vaulteer hochladen» → Run workflow →
Ziel waehlen), nicht bei jedem Push: die Website geht erst live, wenn Logo,
Stammdaten und die geprueften Rechtstexte vorliegen.

Der Workflow baut, prueft auf fremde Domains, laedt per rsync hoch und ruft
zum Schluss die Adresse auf. Antwortet sie nicht mit 200, schlaegt der Lauf
fehl.

**Einrichtung.** Unter Settings → Environments zwei Umgebungen anlegen,
`vorschau` und `live`. Je Umgebung diese Werte setzen:

| Art | Name | Vorschau | Live |
|---|---|---|---|
| Variable | `SITE_URL` | `https://dev.studiostudio.ch` | `https://vaulteer.ch` |
| Variable | `BASE_PATH` | `/vaulteer` | `/` |
| Variable | `SITE_INDEXABLE` | leer lassen | `true` |
| Variable | `DEPLOY_PORT` | nur falls nicht 22 | dito |
| Secret | `DEPLOY_HOST` | Servername | Servername |
| Secret | `DEPLOY_USER` | Benutzername | Benutzername |
| Secret | `DEPLOY_PATH` | Zielverzeichnis, mit `/` am Ende | dito |
| Secret | `DEPLOY_SSH_KEY` | privater Schluessel | privater Schluessel |
| Secret | `DEPLOY_KNOWN_HOSTS` | Fingerabdruck des Servers | dito |

Den Fingerabdruck liefert `ssh-keyscan -H DEIN-SERVER`. Ohne ihn wuerde die
Verbindung blind akzeptiert und ein Angreifer in der Leitung waere nicht vom
Hoster zu unterscheiden.

Fuer den Schluessel ein **eigenes Paar nur fuer den Upload** erzeugen
(`ssh-keygen -t ed25519 -C "github-actions-vaulteer"`), den oeffentlichen Teil
auf dem Server in `~/.ssh/authorized_keys` eintragen, den privaten als Secret
hinterlegen. Nie den persoenlichen Schluessel verwenden — ein eigener laesst
sich einzeln zurueckziehen, ohne den eigenen Zugang zu verlieren.

Zugangsdaten gehoeren ausschliesslich in die Secrets. Nicht ins Repository,
nicht in eine Konfigurationsdatei, nicht in einen Chat.

**Die Sicherung vor dem ersten Lauf.** `rsync --delete` raeumt im
Zielverzeichnis auf. Der Workflow weigert sich bei einem zu allgemeinen Pfad,
aber ein falsch gesetztes, plausibel aussehendes `DEPLOY_PATH` kann er nicht
erkennen. Vor dem ersten Lauf einmal sichern, was dort liegt.

### Die Vorschau gehoert geschuetzt

`dev.studiostudio.ch/vaulteer` steht auf einer fremden, oeffentlich
erreichbaren Domain. Drei Ebenen sichern sie ab, und die erste ist die
wichtigste:

1. **Passwortschutz** auf dem Vorschau-Host (HTTP-Basic-Auth oder das Panel
   des Hosters). Das ist die einzige Massnahme, die wirklich aussperrt.
2. **`noindex, nofollow`** auf jeder Seite. Baut der Build automatisch ein,
   solange `SITE_INDEXABLE` nicht gesetzt ist.
3. **`robots.txt`** mit `Disallow: /`.

Zu Punkt 3 eine Einschraenkung, die oft uebersehen wird: robots.txt gilt
immer fuer die ganze Domain. Ein Crawler liest
`dev.studiostudio.ch/robots.txt`, nicht
`dev.studiostudio.ch/vaulteer/robots.txt`. Die vom Build erzeugte Datei
landet im Unterverzeichnis und bleibt dort wirkungslos. Wirksam ist sie erst
im Wurzelverzeichnis der Domain — und dort gehoert sie mit `studiostudio.ch`
abgestimmt, nicht blind ueberschrieben.

## Serverkonfiguration

`public/.htaccess` wird beim Build nach `dist/` kopiert und landet mit dem
Upload im Web-Wurzelverzeichnis. Sie regelt vier Dinge: HTTPS erzwingen,
Fehlerseite, Sicherheits-Kopfzeilen samt Content-Security-Policy, sowie
Kompression und Zwischenspeicher.

Die Richtlinie erlaubt ausschliesslich Ressourcen der eigenen Domain. Kaeme je
ein Skript, eine Schrift oder ein Zaehlpixel von aussen hinein, blockiert der
Browser es, statt es stillschweigend zu laden — bei diesem Kunden ist das das
Produktversprechen in Serverform. Geprueft im Browser ueber alle 21 Seiten:
keine Verstoesse, keine fehlenden Stile.

**HSTS ist auskommentiert und bleibt es, bis HTTPS sicher laeuft.** Ein zu
frueh gesetzter Eintrag sperrt Besucher aus, wenn am Zertifikat etwas klemmt,
und der Browser merkt sich die Vorgabe monatelang.

Laeuft der Hoster nicht auf Apache, bleibt die Datei wirkungslos; die vier
Bloecke gehoeren dann in die Serverkonfiguration uebertragen.

## Servereinstellungen

- **HTTPS erzwingen** und HSTS aktivieren.
- **Saubere URLs:** Der Build erzeugt pro Seite ein Verzeichnis mit
  `index.html`. Ein Apache-Hoster liefert das ohne Zusatzkonfiguration aus.
- **404:** `dist/404.html` als Fehlerseite eintragen. In der Vorschau
  `ErrorDocument 404 /vaulteer/404.html`, live `ErrorDocument 404 /404.html`.
- **Caching:** `_astro/*` traegt einen Hash im Dateinamen und darf lange
  gecacht werden; HTML-Dateien nicht.

Beispiel `.htaccess` im Wurzelverzeichnis:

```apache
ErrorDocument 404 /404.html

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript image/svg+xml
</IfModule>

<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 month"
  ExpiresByType text/html "access plus 0 seconds"
</IfModule>

<IfModule mod_headers.c>
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
</IfModule>
```

Eine Content-Security-Policy kann eng gefasst werden, weil die Seite keine
Drittressourcen laedt:

```apache
Header always set Content-Security-Policy "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
```

`style-src 'unsafe-inline'` ist noetig, solange Astro Stile inline setzt.
`form-action 'self'` ist anzupassen, sobald das Kontaktformular einen echten
Endpunkt bekommt.

## Vor dem Livegang

- [ ] Hoster gewaehlt, Serverstandort und Rechtsraum geprueft
- [ ] mit `npm run build:live` gebaut, nicht mit `npm run build`
- [ ] `robots.txt` und `noindex` im Live-Build geprueft (beide freigegeben)
- [ ] Vorschau unter `dev.studiostudio.ch/vaulteer` abgeschaltet oder
      weitergeleitet, damit sie nicht als Doppel bestehen bleibt
- [ ] alle `[TODO: ...]` in `src/config/site.ts` ersetzt
- [ ] alle Bild-Platzhalter ersetzt (siehe `IMAGE-BRIEF.md`)
- [ ] Kontaktformular auf einen echten Endpunkt gelegt
- [ ] `robots.txt` und `sitemap-index.xml` auf die richtige Domain geprueft
- [ ] Netzwerk-Tab geprueft: keine Requests an Drittdomains
