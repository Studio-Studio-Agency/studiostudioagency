// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Statische Ausgabe. Kein SSR, kein Adapter — das Build-Ergebnis ist ein
// Verzeichnis, das auf einen Schweizer Hoster hochgeladen wird (siehe DEPLOY.md).
export default defineConfig({
  site: 'https://vaulteer.ch',
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [
    mdx(),
    // Die interne Musterseite steht auf noindex und gehoert nicht in die Sitemap.
    sitemap({ filter: (page) => !page.includes('/styleguide') }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  build: {
    // Ein einziges CSS-Bundle statt pro Seite — weniger Requests, besser cachebar.
    inlineStylesheets: 'auto',
  },
});
