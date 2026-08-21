<?php
/**
 * Kontaktformular-Endpunkt fuer vaulteer.ch
 *
 * Nimmt den POST von /kontakt entgegen, prueft ihn, verschickt eine E-Mail und
 * leitet auf /kontakt/danke weiter.
 *
 * Bewusst ohne Abhaengigkeiten und ohne fremden Dienst. Der Auftraggeber
 * verkauft Datensouveraenitaet — die Anfragen seiner Kunden duerfen nicht ueber
 * einen Formulardienst laufen, schon gar nicht ueber einen US-amerikanischen.
 * Diese Datei ist knapp 200 Zeilen und laesst sich in fuenf Minuten pruefen.
 * Das ist der Punkt.
 *
 * Einrichtung: config.php aus config.example.php erstellen und ausfuellen.
 * Die Datei gehoert NICHT ins Repository (steht in .gitignore).
 */

declare(strict_types=1);

const MAX_FELD = 200;    // Zeichen fuer einzeilige Felder
const MAX_FRAGE = 2000;  // Zeichen fuer das Freitextfeld
const SPERRE_SEKUNDEN = 60;
const SPERRE_ANZAHL = 3;

$config = require __DIR__ . '/config.php';

/** Erlaubte Werte. Serverseitig gepruefte Liste — der Browser ist keine Instanz. */
const GROESSEN = ['1–9', '10–24', '25–49', '50+'];
const ANLIEGEN = ['Lokale KI', 'Beratung Datensouveränität', 'Softwareentwicklung', 'Noch unklar'];

// ---------------------------------------------------------------------------

/**
 * Entfernt Zeilenumbrueche und Steuerzeichen.
 *
 * Ohne das kann jemand ueber ein Formularfeld eigene Kopfzeilen in die E-Mail
 * schreiben — "Header Injection", der klassische Weg, einen Kontaktformular-
 * Endpunkt in einen Spamversand zu verwandeln. Alles, was in eine Kopfzeile
 * geht, laeuft hier durch.
 */
function einzeilig(string $wert): string {
    return trim(preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $wert) ?? '');
}

function feld(string $name, int $max = MAX_FELD): string {
    $wert = $_POST[$name] ?? '';
    if (!is_string($wert)) return '';
    return mb_substr(einzeilig($wert), 0, $max);
}

function abbrechen(string $meldung, int $status = 400): never {
    http_response_code($status);
    header('Content-Type: text/html; charset=utf-8');
    $m = htmlspecialchars($meldung, ENT_QUOTES, 'UTF-8');
    echo <<<HTML
    <!doctype html><html lang="de-CH"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="robots" content="noindex">
    <title>Anfrage nicht gesendet | Vaulteer</title>
    <style>
      body{font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;color:#17171A;
           background:#fff;margin:0;padding:16px;-webkit-font-smoothing:antialiased}
      main{max-width:34rem;margin:12vh auto;padding:0 24px}
      h1{font-size:2rem;font-weight:700;letter-spacing:-.03em;line-height:1.05;margin:0 0 1.5rem}
      p{font-size:1.0625rem;line-height:1.62;margin:0 0 1rem}
      a{color:#D62B00}
      .m{border-left:2px solid #FF3B14;padding-left:1rem;color:#6E6E76}
    </style></head><body><main>
      <h1>Die Anfrage wurde nicht gesendet.</h1>
      <p class="m">{$m}</p>
      <p><a href="/kontakt">Zurück zum Formular</a></p>
    </main></body></html>
    HTML;
    exit;
}

// --- Nur POST -------------------------------------------------------------
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Location: /kontakt', true, 303);
    exit;
}

// --- Honigtopf ------------------------------------------------------------
// Ein Feld, das im Formular versteckt ist und von Menschen nie ausgefuellt
// wird. Automaten fuellen alles aus. Das ersetzt ein CAPTCHA, ohne Nutzende
// zu behelligen und ohne einen Dritten einzubinden — reCAPTCHA schiede hier
// ohnehin aus, es ist ein Google-Dienst.
if (($_POST['website'] ?? '') !== '') {
    header('Location: /kontakt/danke', true, 303);  // Stillschweigend schlucken.
    exit;
}

// --- Felder ---------------------------------------------------------------
$name    = feld('name');
$firma   = feld('firma');
$email   = feld('email');
$telefon = feld('telefon');
$groesse = feld('mitarbeitende');
$thema   = feld('anliegen');
$frage   = mb_substr(trim((string) ($_POST['frage'] ?? '')), 0, MAX_FRAGE);

$fehler = [];
if ($name === '')  $fehler[] = 'Name';
if ($firma === '') $fehler[] = 'Firma';
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $fehler[] = 'E-Mail';
if (!in_array($groesse, GROESSEN, true)) $fehler[] = 'Anzahl Mitarbeitende';
if (!in_array($thema, ANLIEGEN, true))   $fehler[] = 'Worum geht es';

if ($fehler) {
    abbrechen('Bitte prüfen Sie diese Angaben: ' . implode(', ', $fehler) . '.');
}

// --- Einfache Sperre gegen Massenversand ----------------------------------
// Gezaehlt wird erst hier, nach bestandener Pruefung. Wuerde schon der
// fehlerhafte Versuch zaehlen, sperrte sich jemand mit drei Tippfehlern selbst
// aus — und laut Brief kostet jede zusaetzliche Huerde Anfragen. Abgewehrt
// werden soll Massenversand, nicht Ungeschick.
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unbekannt';
$spur = sys_get_temp_dir() . '/vaulteer-kontakt-' . sha1($ip . $config['sperre_salz']);
$jetzt = time();
$treffer = is_file($spur)
    ? array_filter((array) json_decode((string) file_get_contents($spur), true),
                   fn($t) => is_int($t) && $t > $jetzt - SPERRE_SEKUNDEN)
    : [];
if (count($treffer) >= SPERRE_ANZAHL) {
    abbrechen('Es wurden zu viele Anfragen in kurzer Zeit gesendet. '
            . 'Bitte versuchen Sie es in einer Minute erneut oder schreiben Sie direkt an '
            . $config['empfaenger'] . '.', 429);
}
$treffer[] = $jetzt;
@file_put_contents($spur, json_encode(array_values($treffer)), LOCK_EX);

// --- E-Mail zusammenstellen ----------------------------------------------
$betreff = sprintf('Anfrage über vaulteer.ch — %s, %s', $name, $firma);

$zeilen = [
    'Name:               ' . $name,
    'Firma:              ' . $firma,
    'E-Mail:             ' . $email,
    'Telefon:            ' . ($telefon !== '' ? $telefon : '—'),
    'Mitarbeitende:      ' . $groesse,
    'Anliegen:           ' . $thema,
    '',
    'Frage:',
    $frage !== '' ? $frage : '—',
    '',
    str_repeat('-', 60),
    'Gesendet: ' . date('d.m.Y H:i') . ' Uhr',
];
$koerper = implode("\r\n", $zeilen);

// Absender ist die eigene Domain, nicht die Adresse des Absenders — sonst
// scheitert die SPF-Pruefung und die Nachricht landet im Spam. Die Antwort
// geht per Reply-To an die Person, die geschrieben hat.
$kopf = [
    'From: ' . $config['absender_name'] . ' <' . $config['absender'] . '>',
    // Nur die blanke Adresse, ohne Anzeigename. Ein aus dem Formular
    // stammender Name kann Zeichen enthalten, die in einem Display-Name
    // eigene Bedeutung haben (Doppelpunkt, Komma, spitze Klammern); manche
    // Mailprogramme zerlegen die Zeile dann falsch. Der Name steht im Betreff
    // und im Text — in der Kopfzeile bringt er nichts, was das Risiko wert waere.
    'Reply-To: ' . $email,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: vaulteer-kontakt',
];

$ok = mail(
    $config['empfaenger'],
    mb_encode_mimeheader($betreff, 'UTF-8'),
    $koerper,
    implode("\r\n", $kopf),
    '-f' . $config['absender']
);

if (!$ok) {
    error_log('vaulteer: mail() fehlgeschlagen fuer ' . $email);
    abbrechen('Der Versand ist technisch fehlgeschlagen. Bitte schreiben Sie direkt an '
            . $config['empfaenger'] . ' — wir antworten gleich schnell.', 500);
}

header('Location: /kontakt/danke', true, 303);
exit;
