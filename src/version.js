import version, { codename } from "virtual:app-version";

/**
 * Which build of the app this is, baked in from package.json (vite.config.js).
 * Each minor version has a name Glenn chooses: 1.0 is "Caesious".
 */
export const APP_VERSION = version;
export const APP_CODENAME = codename;
/** "1.0.0 · Caesious", or the number alone. */
export const VERSION_LABEL = codename ? `${version} · ${codename}` : version;
