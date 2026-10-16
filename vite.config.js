import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/* Coach is its own app on its own domain. The page calls /api/... on its own
   origin, and Coach's server (server/index.js) relays the sign-in routes to
   Studio, where every Trainability account lives.

   In development the same path is kept: /api goes to Coach's server on 4800
   (`npm run server`), which relays to Studio's API. */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: { "/api": { target: process.env.API_URL || "http://localhost:4800", changeOrigin: true } },
  },
});
