<?php
/**
 * Vorlage. Kopieren nach config.php und ausfuellen.
 * config.php gehoert NICHT ins Repository — sie steht in .gitignore.
 */
return [
    // Wohin die Anfragen gehen.
    'empfaenger'     => 'kontakt@haito.ch',

    // Absenderadresse der Benachrichtigung. Muss eine Adresse der eigenen
    // Domain sein, sonst scheitert die SPF-Pruefung und die Nachricht landet
    // im Spam-Ordner.
    'absender'       => 'noreply@haito.ch',
    'absender_name'  => 'Haito Kontaktformular',

    // Beliebige Zeichenkette. Geht in den Dateinamen der Sperrliste ein,
    // damit aus dem Dateinamen keine IP-Adresse rekonstruierbar ist.
    'sperre_salz'    => 'HIER-EINE-ZUFAELLIGE-ZEICHENKETTE-EINSETZEN',
];
