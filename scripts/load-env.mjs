import path from "node:path";
import { fileURLToPath } from "node:url";

/* server/.env, for the scripts as for the server: never over a variable
   already set. */
try {
  process.loadEnvFile(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "server", ".env"));
} catch { /* no server/.env */ }
