# Deployment

Die Website ist statisch. Es gibt keinen Server, keine Datenbank, keinen
Build-Schritt beim Hoster.

## Zwei Ziele

Die Seite laeuft zuerst als Vorschau in einem Unterverzeichnis, spaeter unter
einer eigenen Domain. Beides ist derselbe Code, unterschieden nur ueber drei
Umgebungsvariablen.

| | Vorschau | Live |
|---|---|---|
| Adresse | `https://dev.studiostudio.ch/vaulteer` | `https://vaulteer.ch` |
| `SITE_URL` | `https://dev.studiostudio.ch` | `https://vaulteer.ch` |
| `BASE_PATH` | `/vaulteer` | `/` |
| `SITE_INDEXABLE` | nicht gesetzt | `true` |
| Suchindex | gesperrt | freigegeben |
| Befehl | `npm run build` | `npm run build:live` |

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
