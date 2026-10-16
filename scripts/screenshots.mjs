import "./load-env.mjs";
import puppeteer from "puppeteer-core";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The manual's pictures, taken from the running app — Studio's
 * `npm run screenshots`, for Coach.
 *
 *   npm run screenshots
 *
 * Needs the app running (`npm run dev`, with `npm run server` and Studio's
 * fixture API behind it — README, Running it locally) and a test account in
 * server/.env as SHOT_EMAIL and SHOT_PASSWORD. Never point it at a real
 * account: it signs in.
 *
 * Phone-sized and in light mode, so the pictures match what most people see,
 * and on the CPU rasteriser, so an untouched screen gives the same file twice.
 */

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "docs", "images");
const URL = process.env.SHOT_URL || "http://localhost:5174/";
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const { SHOT_EMAIL, SHOT_PASSWORD } = process.env;
if (!SHOT_EMAIL || !SHOT_PASSWORD) {
  console.error("Set SHOT_EMAIL and SHOT_PASSWORD in server/.env (a test account, never a real one).");
  process.exit(2);
}

const PHONE = { width: 440, height: 940, deviceScaleFactor: 1.5 };

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--force-color-profile=srgb", "--hide-scrollbars", "--disable-gpu"],
});
await mkdir(OUT, { recursive: true });
const page = await browser.newPage();
await page.setViewport(PHONE);
await page.emulateMediaFeatures([
  { name: "prefers-color-scheme", value: "light" },
  { name: "prefers-reduced-motion", value: "reduce" },   // the hexagons hold still
]);

async function shot(name) {
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log("  ✓", name);
}

try {
  await page.goto(URL, { waitUntil: "networkidle0" });
  await page.waitForSelector('input[type="email"]');
  await shot("01-login");

  await page.type('input[type="email"]', SHOT_EMAIL);
  await page.type('input[type="password"]', SHOT_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForSelector("h1", { timeout: 10000 });
  await shot("02-home");

  /* Signed out again, so the next run starts from the sign-in screen. */
  await page.evaluate(() => fetch("/api/auth/logout", { method: "POST", credentials: "include" }));
} finally {
  await browser.close();
}
