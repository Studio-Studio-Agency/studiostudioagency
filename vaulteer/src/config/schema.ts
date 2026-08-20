import { site } from './site';
import type { FaqItem } from './faq';

/**
 * Strukturierte Daten. Der Brief verlangt Organization, LocalBusiness und
 * FAQPage auf den Leistungsseiten, Article im Wissensbereich.
 *
 * Alle Angaben stammen aus site.ts. Wo dort ein [TODO] steht, steht es auch
 * hier — erfundene Adressen oder Telefonnummern in strukturierten Daten waeren
 * schlimmer als fehlende, weil Suchmaschinen sie als Fakten uebernehmen.
 */
const hasValue = (v: string) => !v.startsWith('[TODO');

export function organization(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteUrl}#organization`,
    name: site.name,
    legalName: site.legalName,
    url: siteUrl,
    description:
      'Vaulteer baut und betreibt lokale KI-Systeme für Schweizer KMU und berät zu Datensouveränität.',
    ...(hasValue(site.email) ? { email: site.email } : {}),
    ...(hasValue(site.phone) ? { telephone: site.phone } : {}),
    address: {
      '@type': 'PostalAddress',
      ...(hasValue(site.address.street) ? { streetAddress: site.address.street } : {}),
      ...(hasValue(site.address.postalCode) ? { postalCode: site.address.postalCode } : {}),
      addressLocality: site.address.locality,
      addressRegion: site.address.region,
      addressCountry: site.address.country,
    },
  };
}

export function localBusiness(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': `${siteUrl}#localbusiness`,
    name: site.legalName,
    url: siteUrl,
    parentOrganization: { '@id': `${siteUrl}#organization` },
    areaServed: { '@type': 'Country', name: 'Schweiz' },
    priceRange: 'CHF',
    ...(hasValue(site.email) ? { email: site.email } : {}),
    ...(hasValue(site.phone) ? { telephone: site.phone } : {}),
    address: {
      '@type': 'PostalAddress',
      ...(hasValue(site.address.street) ? { streetAddress: site.address.street } : {}),
      ...(hasValue(site.address.postalCode) ? { postalCode: site.address.postalCode } : {}),
      addressLocality: site.address.locality,
      addressRegion: site.address.region,
      addressCountry: site.address.country,
    },
  };
}

export function faqPage(items: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

export function article(input: {
  siteUrl: string;
  url: string;
  headline: string;
  description: string;
  publishDate: Date;
  updatedDate?: Date;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    datePublished: input.publishDate.toISOString().slice(0, 10),
    ...(input.updatedDate
      ? { dateModified: input.updatedDate.toISOString().slice(0, 10) }
      : {}),
    mainEntityOfPage: { '@type': 'WebPage', '@id': input.url },
    publisher: { '@id': `${input.siteUrl}#organization` },
    inLanguage: 'de-CH',
  };
}
