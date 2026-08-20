/**
 * Zentrale Stammdaten und Navigation.
 * Platzhalter sind als [TODO: ...] markiert und stammen NICHT aus dem Brief —
 * sie muessen vor dem Livegang durch echte Angaben ersetzt werden.
 */

export const site = {
  name: 'Vaulteer',
  legalName: 'Vaulteer GmbH',
  url: 'https://vaulteer.ch',
  locale: 'de-CH',
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
      { href: '/leistungen/local-ai', label: 'Local AI' },
      { href: '/leistungen/consulting', label: 'Consulting' },
      { href: '/leistungen/development', label: 'Development' },
    ],
  },
  { href: '/vorgehen', label: 'Vorgehen und Preise' },
  {
    href: '/anwendungsfaelle',
    label: 'Anwendungsfaelle',
    children: [
      { href: '/anwendungsfaelle/kanzleien', label: 'Kanzleien' },
      { href: '/anwendungsfaelle/treuhand', label: 'Treuhand' },
      { href: '/anwendungsfaelle/gesundheit', label: 'Gesundheit' },
      { href: '/anwendungsfaelle/industrie', label: 'Industrie' },
    ],
  },
  { href: '/wissen', label: 'Wissen' },
  { href: '/ueber-uns', label: 'Ueber uns' },
];

export const footerLegal: NavItem[] = [
  { href: '/impressum', label: 'Impressum' },
  { href: '/datenschutz', label: 'Datenschutz' },
];
