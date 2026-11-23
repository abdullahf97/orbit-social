/**
 * Captures the screenshots used in README.md.
 *
 * Usage: npm run dev (or npm start) in one shell, then:
 *   npm run screenshots
 *
 * Requires a seeded database (npm run db:seed) so the feed has content.
 */
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const base = process.env.SCREENSHOTS_BASE_URL ?? "http://localhost:3000";
const outDir = "docs/screenshots";
const demo = { identifier: "nova@orbit.app", password: "orbitdemo" };

const shots = [
  { name: "landing", path: "/", signedOut: true, height: 1000 },
  { name: "feed", path: "/feed", height: 1000 },
  { name: "explore", path: "/explore", height: 1000 },
  { name: "notifications", path: "/notifications", height: 900 },
  { name: "profile", path: "/u/nova", height: 900 },
];

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();

async function save(page, name) {
  const png = await page.screenshot({ fullPage: false });
  await sharp(png).resize({ width: 1600, withoutEnlargement: true }).png({
    compressionLevel: 9,
    palette: true,
  }).toFile(`${outDir}/${name}.png`);
  console.log(`• ${outDir}/${name}.png`);
}

const desktop = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  colorScheme: "dark",
  reducedMotion: "reduce",
});

const page = await desktop.newPage();

for (const shot of shots) {
  if (shot.signedOut) {
    await page.goto(`${base}${shot.path}`, { waitUntil: "networkidle" });
  } else {
    if (!(await page.request.storageState()).cookies.length) {
      const login = await page.request.post(`${base}/api/auth/login`, { data: demo });
      if (!login.ok()) throw new Error(await login.text());
    }
    await page.goto(`${base}${shot.path}`, { waitUntil: "networkidle" });
    await page.waitForSelector("main");
  }
  await page.setViewportSize({ width: 1440, height: shot.height });
  await page.waitForTimeout(600);
  await save(page, shot.name);
}

const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  colorScheme: "dark",
  reducedMotion: "reduce",
  isMobile: true,
  hasTouch: true,
});

const mobilePage = await mobile.newPage();
const mobileLogin = await mobilePage.request.post(`${base}/api/auth/login`, {
  data: demo,
});
if (!mobileLogin.ok()) throw new Error(await mobileLogin.text());
await mobilePage.goto(`${base}/feed`, { waitUntil: "networkidle" });
await mobilePage.waitForSelector("article");
await mobilePage.waitForTimeout(600);
await save(mobilePage, "mobile-feed");

await browser.close();
console.log("\nDone.");
