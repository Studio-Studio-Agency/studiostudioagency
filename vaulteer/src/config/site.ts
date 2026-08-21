/**
 * Zentrale Stammdaten und Navigation.
 * Platzhalter sind als [TODO: ...] markiert und stammen NICHT aus dem Brief —
 * sie muessen vor dem Livegang durch echte Angaben ersetzt werden.
 */

export const site = {
  name: 'Vaulteer',
  legalName: 'Vaulteer GmbH',
  /** Aus astro.config.mjs (SITE_URL). Nicht hier haendisch setzen. */
  url: import.meta.env.SITE,
  locale: 'de-CH',
  /** Vorgesehen: kontakt@vaulteer.ch — bis zur Einrichtung Platzhalter. */
  email: '[TODO: E-Mail-Adresse]',
  phone: '[TODO: Telefonnummer]',
  address: {
    street: '[TODO: Strasse und Nummer]',
    postalCode: '[TODO: PLZ]',
    locality: 'Basel',
    region: 'Basel-Stadt',
    country: 'CH',
  },
} as const;

/**
 * Basispfad. Die Seite laeuft in der Vorschau unter einem Unterverzeichnis
 * (/vaulteer), spaeter unter einer eigenen Domain (/). Jeder interne Link
 * laeuft deshalb durch withBase() — nie ein nacktes href="/leistungen".
 *
 * Astro setzt import.meta.env.BASE_URL aus dem base-Wert der Konfiguration.
 */
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export function withBase(path: string): string {
  if (/^(https?:|mailto:|tel:|#)/.test(path)) return path;
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${BASE}${clean}` || '/';
}

/** Gegenstueck: Basispfad von einem Pfad abziehen, fuer Aktiv-Vergleiche. */
export function stripBase(pathname: string): string {
  const stripped = BASE && pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname;
  return stripped.replace(/\/$/, '') || '/';
}

/** Vorschau darf nicht in den Suchindex. Wird ueber SITE_INDEXABLE gesetzt. */
export const indexable: boolean = import.meta.env.SITE_INDEXABLE === true;

/**
 * Ziel des Kontaktformulars. Der Endpunkt liegt als PHP-Datei unter
 * endpoint/kontakt.php im Projekt und wird ins Web-Wurzelverzeichnis
 * hochgeladen (siehe DEPLOY.md). Der Pfad ist relativ zur Domain und damit
 * unabhaengig vom Basispfad — er darf NICHT durch withBase() laufen, weil der
 * Endpunkt auch in der Vorschau im Wurzelverzeichnis liegt.
 */
export const formEndpoint = '/endpoint/kontakt.php';

export type NavItem = {
  href: string;
  label: string;
  children?: NavItem[];
};

export const nav: NavItem[] = [
  {
    href: '/leistungen',
    label: 'Leistungen',
    children: [
      { href: '/leistungen/local-ai', label: 'Lokale KI-Systeme' },
      { href: '/leistungen/consulting', label: 'Beratung Datensouveränität' },
      { href: '/leistungen/development', label: 'KI-Software-Entwicklung' },
    ],
  },
  { href: '/vorgehen', label: 'Vorgehen und Preise' },
  {
    href: '/anwendungsfaelle',
    label: 'Anwendungsfälle',
    children: [
      { href: '/anwendungsfaelle/anwaltskanzleien', label: 'Anwaltskanzleien' },
      { href: '/anwendungsfaelle/treuhand', label: 'Treuhand' },
      { href: '/anwendungsfaelle/gesundheitswesen', label: 'Gesundheitswesen' },
      { href: '/anwendungsfaelle/industrie', label: 'Industrie' },
    ],
  },
  { href: '/wissen', label: 'Wissen' },
  { href: '/ueber-uns', label: 'Über uns' },
];

export const footerLegal: NavItem[] = [
  { href: '/impressum', label: 'Impressum' },
  { href: '/datenschutz', label: 'Datenschutz' },
  { href: '/agb', label: 'AGB' },
];
