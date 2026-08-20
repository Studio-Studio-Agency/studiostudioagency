// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

/**
 * Statische Ausgabe. Kein SSR, kein Adapter — das Build-Ergebnis ist ein
 * Verzeichnis, das auf einen Schweizer Hoster hochgeladen wird (siehe DEPLOY.md).
 *
 * Host und Basispfad kommen aus der Umgebung, damit der Umzug von der
 * Vorschau auf die eigene Domain eine Variable ist und keine Suchen-und-
 * Ersetzen-Runde durch alle Dateien:
 *
 *   Vorschau  SITE_URL=https://dev.studiostudio.ch  BASE_PATH=/vaulteer
 *   Live      SITE_URL=https://vaulteer.ch          BASE_PATH=/
 *
 * SITE_INDEXABLE steuert, ob die Seite indexiert werden darf. Standard ist
 * nein — eine Vorschau gehoert nicht in den Suchindex.
 */
const SITE_URL = process.env.SITE_URL ?? 'https://dev.studiostudio.ch';
const BASE_PATH = process.env.BASE_PATH ?? '/vaulteer';
const INDEXABLE = process.env.SITE_INDEXABLE === 'true';

/** Merkliste fuer die Sitemap-Normalisierung weiter unten. */
const seenUrls = new Set();

export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH,
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [
    mdx(),
    sitemap({
      // Die interne Musterseite steht auf noindex und gehoert nicht in die Sitemap.
      filter: (page) => !page.includes('/styleguide'),
      // Mit base erzeugt die Integration die Wurzel doppelt (mit und ohne
      // Schraegstrich). Auf eine Schreibweise normalisieren und Duplikate
      // verwerfen — sonst meldet die Search Console doppelte Inhalte.
      serialize(item) {
        const url = new URL(item.url);
        url.pathname = url.pathname.replace(/(.)\/$/, '$1');
        const href = url.href;
        if (seenUrls.has(href)) return undefined;
        seenUrls.add(href);
        return { ...item, url: href };
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    define: {
      // Im Seitencode ueber import.meta.env verfuegbar.
      'import.meta.env.SITE_INDEXABLE': JSON.stringify(INDEXABLE),
    },
  },
  build: {
    inlineStylesheets: 'auto',
  },
});
