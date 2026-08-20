# Deployment

Die Website ist statisch. Es gibt keinen Server, keine Datenbank, keinen
Build-Schritt beim Hoster.

## Build

```sh
npm ci
npm run build
```

Ergebnis: **`dist/`**. Dieses Verzeichnis wird hochgeladen — sein *Inhalt*
gehoert in das Web-Wurzelverzeichnis des Hosters, nicht der Ordner selbst.

Vorher lokal pruefen:

```sh
npm run preview   # http://localhost:4321
```

## Hosting

Zielhoster ist ein Schweizer Anbieter, z. B. **Infomaniak** (Rechenzentren in
Genf und Winterthur, Schweizer Recht). Ein einfaches Webhosting genuegt;
Node.js wird auf dem Server nicht gebraucht.

Bewusst **nicht** eingerichtet sind Vercel und Netlify. Beides sind
US-Anbieter, deren Nutzung dem Produktversprechen des Auftraggebers
widerspricht — die Website eines Anbieters von Datensouveraenitaet sollte
nicht in einem US-CDN liegen.

### Upload

Bei Infomaniak liegt das Wurzelverzeichnis unter `/web` (bzw. dem in der
Verwaltung gesetzten Pfad):

```sh
rsync -avz --delete dist/ BENUTZER@HOST:/home/clients/KUNDENNUMMER/sites/vaulteer.ch/
```

`--delete` raeumt Dateien weg, die im Build nicht mehr vorkommen. Alternativ
ueber den Dateimanager oder FTP des Hosters.

## Servereinstellungen

- **HTTPS erzwingen** und HSTS aktivieren.
- **Saubere URLs:** Der Build erzeugt pro Seite ein Verzeichnis mit
  `index.html`. Ein Apache-Hoster liefert das ohne Zusatzkonfiguration aus.
- **404:** `dist/404.html` als Fehlerseite eintragen
  (`ErrorDocument 404 /404.html` in `.htaccess`).
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

- [ ] `site` in `astro.config.mjs` auf die endgueltige Domain gesetzt
- [ ] alle `[TODO: ...]` in `src/config/site.ts` ersetzt
- [ ] alle Bild-Platzhalter ersetzt (siehe `IMAGE-BRIEF.md`)
- [ ] Kontaktformular auf einen echten Endpunkt gelegt
- [ ] `robots.txt` und `sitemap-index.xml` auf die richtige Domain geprueft
- [ ] Netzwerk-Tab geprueft: keine Requests an Drittdomains
