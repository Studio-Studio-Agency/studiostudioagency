import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

/**
 * Standalone-Build NUR für den Klimapartner-Teil (ohne GoodGoods-App).
 *
 *   npm run build:klimapartner   →   dist-klimapartner/
 *
 * Gedacht fürs Hosting unter https://<domain>/klimapartner/ — `base` sorgt
 * dafür, dass Assets unter diesem Pfad aufgelöst werden. Deployment-Details:
 * docs/klimapartner-deployment.md
 */

// Vite benennt die Ausgabedatei nach dem Entry (klimapartner.html);
// Webserver erwarten index.html — nach dem Build umbenennen.
function renameEntryHtml(): Plugin {
  return {
    name: "klima-rename-entry-html",
    closeBundle() {
      const dir = path.resolve(__dirname, "dist-klimapartner");
      const from = path.join(dir, "klimapartner.html");
      const to = path.join(dir, "index.html");
      if (fs.existsSync(from)) fs.renameSync(from, to);
    },
  };
}

export default defineConfig({
  base: "/klimapartner/",
  // public/ enthält GoodGoods-Assets (PWA-Manifest, Icons) — nicht mitkopieren.
  publicDir: false,
  plugins: [react(), renameEntryHtml()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist-klimapartner",
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "klimapartner.html"),
    },
  },
});
