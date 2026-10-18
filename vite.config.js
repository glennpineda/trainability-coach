import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "node:fs";

/* The version and its name, baked into the bundle from package.json, as in
   Studio: the browser has no package.json to read. */
const VERSION_ID = "virtual:app-version";
const appVersion = {
  name: "app-version",
  resolveId(id) { return id === VERSION_ID ? `\0${VERSION_ID}` : undefined; },
  load(id) {
    if (id !== `\0${VERSION_ID}`) return undefined;
    const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
    return `export default ${JSON.stringify(pkg.version)};\nexport const codename = ${JSON.stringify(pkg.codename || null)};`;
  },
};

/* Coach is its own app on its own domain. The page calls /api/... on its own
   origin, and Coach's server (server/index.js) relays the sign-in routes to
   Studio, where every Trainability account lives.

   In development the same path is kept: /api goes to Coach's server on 4800
   (`npm run server`), which relays to Studio's API. */
export default defineConfig({
  plugins: [react(), tailwindcss(), appVersion],
  /* PostCSS set here, empty, so Vite never looks for a postcss.config.js.
     Tailwind 4 runs as the Vite plugin above and needs none. The host
     unpacks each deploy over the last without emptying /app
     (cleanAppDirBeforeExtract: false), so the postcss.config.js that 0.1.0
     shipped, deleted when Coach moved to Tailwind 4, is still there and
     broke the build of 1.0.12 ("trying to use tailwindcss directly as a
     PostCSS plugin"; 17 Oct 2026). */
  css: { postcss: { plugins: [] } },
  server: {
    port: 5174,
    proxy: { "/api": { target: process.env.API_URL || "http://localhost:4800", changeOrigin: true } },
  },
});
