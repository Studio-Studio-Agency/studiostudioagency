# Kontaktformular-Endpunkt

Nimmt den POST von `/kontakt` entgegen, prueft ihn, verschickt eine E-Mail und
leitet auf `/kontakt/danke` weiter.

Ohne Abhaengigkeiten, ohne fremden Dienst, knapp 200 Zeilen. Der Auftraggeber
verkauft Datensouveraenitaet — die Anfragen seiner Kunden duerfen nicht ueber
einen Formulardienst laufen, schon gar nicht ueber einen US-amerikanischen.
Dass die Datei in fuenf Minuten vollstaendig zu pruefen ist, ist der Zweck.

## Einrichtung

```sh
cp config.example.php config.php   # ausfuellen
```

`config.php` steht in `.gitignore` und gehoert nicht ins Repository.

Hochladen: den Ordner `endpoint/` ins Web-Wurzelverzeichnis, sodass der
Endpunkt unter `/endpoint/kontakt.php` erreichbar ist. Das ist der Pfad, den
`src/config/site.ts` als `formEndpoint` setzt.

Voraussetzung ist PHP 8 auf dem Hoster. Auf Schweizer Webhosting ist das der
Normalfall; ist kein PHP verfuegbar, muss der Endpunkt in der jeweils
vorhandenen Sprache nachgebaut werden — der Vertrag steht unten.

## Vertrag mit dem Formular

| Feld | Pflicht | Erlaubte Werte |
|---|---|---|
| `name` | ja | Text, max. 200 Zeichen |
| `firma` | ja | Text, max. 200 Zeichen |
| `email` | ja | gueltige E-Mail-Adresse |
| `telefon` | nein | Text, max. 200 Zeichen |
| `mitarbeitende` | ja | `1–9`, `10–24`, `25–49`, `50+` |
| `anliegen` | ja | `Lokale KI`, `Beratung Datensouveränität`, `Softwareentwicklung`, `Noch unklar` |
| `frage` | nein | Text, max. 2000 Zeichen |
| `website` | — | Honigtopf, muss leer sein |

Die Auswahlwerte stehen doppelt: in `src/pages/kontakt.astro` und in
`endpoint/kontakt.php`. Wer sie aendert, muss beide anfassen. Serverseitig
gegen eine feste Liste zu pruefen ist nicht verhandelbar — der Browser ist
keine Instanz, ein POST laesst sich mit beliebigen Werten von Hand absetzen.

## Was der Endpunkt abwehrt

**Header-Injection.** Zeilenumbrueche und Steuerzeichen werden aus allen
Feldern entfernt, die in eine Kopfzeile gehen. Ohne das kann jemand ueber das
Namensfeld ein `Bcc:` einschleusen und den Endpunkt in einen Spamversand
verwandeln. Geprueft mit einem Namen, der `\r\nBcc:` enthaelt: die Umbrueche
werden zu Leerzeichen, die Nachricht hat genau eine Subject-Zeile und kein Bcc.

**Automaten.** Ein Honigtopf-Feld, fuer Menschen unsichtbar und nicht per
Tabulator erreichbar. Ist es ausgefuellt, wird die Anfrage stillschweigend
verworfen — mit Weiterleitung auf die Danke-Seite, damit der Automat keine
Rueckmeldung ueber die Erkennung bekommt. Ein CAPTCHA gibt es bewusst nicht:
reCAPTCHA ist ein Google-Dienst und damit hier ausgeschlossen.

**Massenversand.** Hoechstens drei erfolgreiche Anfragen pro IP-Adresse und
Minute. Gezaehlt wird erst nach bestandener Pruefung — wuerde schon der
fehlerhafte Versuch zaehlen, sperrte sich jemand mit drei Tippfehlern selbst
aus.

## Zustellbarkeit

`From:` ist eine Adresse der eigenen Domain, nicht die des Absenders. Andernfalls
scheitert die SPF-Pruefung und die Nachricht landet im Spam-Ordner. Die Antwort
geht ueber `Reply-To:` an die Person, die geschrieben hat.

Versendet wird mit `mail()`. Das genuegt auf den meisten Hostings, sofern SPF
und DKIM fuer die Domain gesetzt sind. Kommen Nachrichten nicht an, ist der
naechste Schritt SMTP-Versand ueber den Mailserver des Hosters — dann muss die
Funktion `mail()` durch einen SMTP-Aufruf ersetzt werden, der Rest bleibt.

## Alternative ohne PHP

Liegt kein PHP vor, kann derselbe Vertrag in Node bedient werden. Der Endpunkt
braucht nur: POST annehmen, gegen die Liste oben pruefen, Zeilenumbrueche aus
Kopfzeilenfeldern entfernen, E-Mail versenden, mit Status 303 auf
`/kontakt/danke` weiterleiten. Bei Fehlern Status 400 und eine Seite mit
Rueckweg. Mehr ist es nicht.
