# Klimapartner Basel — Deployment-Anleitung

Schritt für Schritt: lokal entwickeln (z. B. in **Windsurf**), das Backend auf
**Supabase** deployen und das Frontend auf dem **eigenen Server** unter
`https://<deine-domain>/klimapartner/` veröffentlichen — ganz ohne Lovable.

> Architektur-Überblick und Feature-Doku: [`klimapartner-bot.md`](./klimapartner-bot.md)

---

## 1. Voraussetzungen

| Was | Wozu |
|-----|------|
| [Node.js 20+](https://nodejs.org) | Frontend bauen und lokal entwickeln |
| [Supabase CLI](https://supabase.com/docs/guides/cli) | Backend deployen (`brew install supabase/tap/supabase` oder `npx supabase`) |
| Anthropic API-Key ([console.anthropic.com](https://console.anthropic.com)) | Der Chat läuft über Claude |
| Zugang zum Supabase-Projekt `itxpdoppymvbotsiutea` | Datenbank + Edge Functions |

## 2. Projekt lokal öffnen (Windsurf)

```bash
git clone https://github.com/Studio-Studio-Agency/studiostudioagency.git
cd studiostudioagency
npm install
```

In Windsurf: **Open Folder** → das geklonte Verzeichnis wählen. Die Befehle
unten laufen im integrierten Terminal.

Dev-Server starten:

```bash
npm run dev
# → http://localhost:8080/klimapartner        (Chatbot)
# → http://localhost:8080/klimapartner/leads  (Dashboard, Login nötig)
```

Die Seite lädt sofort — der **Chat antwortet aber erst nach Schritt 3**
(er spricht mit den Supabase Edge Functions).

## 3. Backend einmalig deployen (Supabase)

```bash
# 3.1 Anmelden und Projekt verknüpfen
supabase login
supabase link --project-ref itxpdoppymvbotsiutea

# 3.2 Datenbank-Migrationen anwenden
#     (Lead-Tabellen, Wissensdatenbank/pgvector, Foto-Bucket)
supabase db push

# 3.3 Secrets setzen
supabase secrets set \
  ANTHROPIC_API_KEY=sk-ant-... \
  KLIMA_ADMIN_EMAILS=studio@alainsz.com
# Optional (Feature bleibt sonst einfach aus):
#   KLIMA_SLACK_WEBHOOK_URL=...   Slack-Benachrichtigung bei neuen Leads
#   RESEND_API_KEY=... KLIMA_LEAD_NOTIFY_EMAIL=...   E-Mail-Benachrichtigung
#   POSTHOG_API_KEY=...           Funnel-Tracking (serverseitig)
#   GOOGLE_MAPS_API_KEY=...       Adressvalidierung

# 3.4 Edge Functions deployen
supabase functions deploy klima-chat klima-knowledge klima-admin

# 3.5 FAQ-Wissensdatenbank mit Beispiel-Inhalten befüllen
#     (Service-Role-Key: Supabase-Dashboard → Settings → API)
curl -X POST "https://itxpdoppymvbotsiutea.supabase.co/functions/v1/klima-knowledge" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"seed": true}'
```

**Danach testen:** `npm run dev` → `http://localhost:8080/klimapartner` →
der Chat sollte auf Deutsch begrüssen und Fragen stellen.

**Fürs Dashboard** braucht es ein Login-Konto: Supabase-Dashboard →
*Authentication → Users → Add user* (E-Mail + Passwort). Die E-Mail muss in
`KLIMA_ADMIN_EMAILS` stehen, sonst antwortet das Dashboard mit «Kein Zugriff».

## 4. Frontend auf dem eigenen Server (studiostudio.ch/klimapartner)

Es gibt einen **schlanken Standalone-Build nur mit dem Klimapartner-Teil**
(ohne die GoodGoods-App):

```bash
npm run build:klimapartner
# → dist-klimapartner/  (index.html + assets/, ~720 kB JS gzipped ~215 kB)
```

Den Inhalt von `dist-klimapartner/` auf den Server laden, sodass er unter
`/klimapartner/` liegt, z. B.:

```bash
rsync -avz --delete dist-klimapartner/ user@server:/var/www/studiostudio/klimapartner/
```

### nginx

```nginx
# Weiterleitung ohne Trailing-Slash
location = /klimapartner { return 301 /klimapartner/; }

# SPA: unbekannte Pfade auf index.html zurückfallen lassen
location ^~ /klimapartner/ {
  root /var/www/studiostudio;   # enthält den Ordner klimapartner/
  try_files $uri $uri/ /klimapartner/index.html;
}
```

### Apache (.htaccess im Ordner klimapartner/)

```apache
RewriteEngine On
RewriteBase /klimapartner/
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . index.html [L]
```

Danach erreichbar unter:

- `https://studiostudio.ch/klimapartner/` — Chatbot (öffentlich)
- `https://studiostudio.ch/klimapartner/leads` — Lead-Dashboard (Login)

Der Standalone-Build bringt fürs Dashboard ein eigenes, kompaktes
Login-Formular mit (`KlimaAuthGate`) — die GoodGoods-App wird nicht benötigt.

> **Hinweis:** Die Supabase-URL und der öffentliche Anon-Key werden beim Build
> aus `.env` eingebettet (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`).
> Das ist unbedenklich — der Anon-Key ist für den Browser bestimmt; alle
> sensiblen Rechte liegen serverseitig (RLS + Service-Role).

## 5. Checkliste vor dem Go-live

- [ ] **FAQ-Texte fachlich prüfen/ersetzen** — die Seed-Inhalte in
      `supabase/functions/klima-knowledge/seed-data.ts` sind bewusst vage
      Platzhalter (Kosten, Förderung, Bewilligung!). Eigene Inhalte per
      `{"entries": [...]}` an dieselbe Function senden.
- [ ] Smoke-Test: Begrüssung → Segment-Erkennung → Sachfrage (kommt die
      Antwort aus der Wissensdatenbank?) → Foto-Upload → Kontaktdaten →
      erscheint der Lead im Dashboard? Slack/Mail angekommen?
- [ ] Dashboard-Konten angelegt + `KLIMA_ADMIN_EMAILS` gesetzt
- [ ] Optional: PostHog-Funnel prüfen (Events `klima_chat_opened` … `klima_lead_notified`)

## 6. Troubleshooting

| Symptom | Ursache / Lösung |
|---|---|
| Chat zeigt «ANTHROPIC_API_KEY not configured» | Secret fehlt → Schritt 3.3, danach Functions **neu deployen ist nicht nötig** (Secrets gelten sofort) |
| Chat lädt endlos / Netzwerkfehler | Functions nicht deployed (Schritt 3.4) oder Browser-Konsole prüfen |
| 404 beim Neuladen von `/klimapartner/leads` | SPA-Fallback fehlt → nginx/Apache-Konfiguration aus Schritt 4 |
| Dashboard: «Kein Zugriff» | Login-E-Mail nicht in `KLIMA_ADMIN_EMAILS` |
| Sachfragen werden nur vage beantwortet | Wissensdatenbank leer → Seed (Schritt 3.5); Function-Logs: `supabase functions logs klima-chat` |
| «Zu viele neue Gespräche …» beim Testen | Rate-Limit (6 neue Sessions/h pro IP) — kurz warten oder Session behalten (Reset-Knopf vermeiden) |
