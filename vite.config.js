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
  server: {
    port: 5174,
    proxy: { "/api": { target: process.env.API_URL || "http://localhost:4800", changeOrigin: true } },
  },
});
