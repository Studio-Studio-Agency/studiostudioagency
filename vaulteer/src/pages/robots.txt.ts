import type { APIRoute } from 'astro';
import { indexable, withBase } from '../config/site';

/**
 * robots.txt wird erzeugt, nicht statisch abgelegt — der Inhalt haengt davon
 * ab, ob die Seite indexiert werden darf.
 *
 * Die Vorschau laeuft unter einem Unterverzeichnis einer fremden Domain
 * (dev.studiostudio.ch). Wuerde sie indexiert, entstuenden doppelte Inhalte
 * gegen die spaetere eigene Domain, und ein unfertiger Stand waere
 * auffindbar. Deshalb: alles gesperrt, solange SITE_INDEXABLE nicht gesetzt
 * ist.
 *
 * Achtung: robots.txt gilt immer fuer die ganze Domain, nicht fuer ein
 * Unterverzeichnis. Unter dev.studiostudio.ch/vaulteer/robots.txt liest sie
 * kein Crawler — massgeblich ist dev.studiostudio.ch/robots.txt. Der Schutz
 * der Vorschau haengt deshalb am noindex-Meta jeder Seite und idealerweise
 * an einem Passwortschutz auf dem Vorschau-Host.
 */
export const GET: APIRoute = ({ site }) => {
  const body = indexable
    ? [
        'User-agent: *',
        'Allow: /',
        '',
        `Sitemap: ${new URL(withBase('/sitemap-index.xml'), site).href}`,
        '',
      ].join('\n')
    : ['User-agent: *', 'Disallow: /', '', ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
