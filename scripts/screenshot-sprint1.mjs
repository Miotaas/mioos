import { chromium } from "playwright";
import { webcrypto } from "crypto";
import { mkdirSync } from "fs";
import { join } from "path";

const SECRET = "dev-only-insecure-secret-set-SESSION_SECRET-in-production";
const BASE   = "http://localhost:3000";
const OUT    = join(import.meta.dirname, "../screenshots/sprint1");
mkdirSync(OUT, { recursive: true });

function encodeBase64url(bytes) {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return Buffer.from(str, "binary").toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
async function createToken(secret) {
  const payload  = JSON.stringify({ exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  const payloadB = new TextEncoder().encode(payload);
  const keyMat   = new TextEncoder().encode(secret);
  const key = await webcrypto.subtle.importKey("raw", keyMat, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await webcrypto.subtle.sign("HMAC", key, payloadB);
  return `${encodeBase64url(payloadB)}.${encodeBase64url(new Uint8Array(sig))}`;
}

const token = await createToken(SECRET);
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies([{ name: "mioos-session", value: token, domain: "localhost", path: "/", httpOnly: true, sameSite: "Strict" }]);
const page = await ctx.newPage();
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);

async function nav(label) {
  await page.locator(`aside button:has-text("${label}")`).first().click();
  await page.waitForTimeout(2500);
}
async function shot(name) {
  await page.screenshot({ path: join(OUT, name) });
  console.log(`  ✓  ${name}`);
}

await shot("01-today.png");
await nav("Decide");     await shot("02-decide.png");
await nav("Projects");   await shot("03-projects.png");
await nav("Workforce");  await shot("04-workforce.png");

// Also scroll down in Workforce to see all 4 teams
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(500);
await shot("04b-workforce-panel.png");

await nav("Life");       await shot("05-life.png");
await nav("Settings");   await shot("06-settings.png");

await ctx.close();
await browser.close();
console.log(`\nSaved to: ${OUT}`);
