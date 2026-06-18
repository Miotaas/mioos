/**
 * Phase 4 + Phase 5 screenshots — Decide view and Projects view.
 */
import { chromium } from "playwright";
import { webcrypto } from "crypto";
import { mkdirSync } from "fs";
import { join } from "path";

const SECRET = "dev-only-insecure-secret-set-SESSION_SECRET-in-production";
const BASE   = "http://localhost:3000";
const OUT    = join(import.meta.dirname, "../screenshots");

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
  const key = await webcrypto.subtle.importKey(
    "raw", keyMat, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await webcrypto.subtle.sign("HMAC", key, payloadB);
  return `${encodeBase64url(payloadB)}.${encodeBase64url(new Uint8Array(sig))}`;
}

const token   = await createToken(SECRET);
const browser = await chromium.launch({ headless: true });

const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies([{
  name: "mioos-session", value: token,
  domain: "localhost", path: "/",
  httpOnly: true, sameSite: "Strict",
}]);

const page = await ctx.newPage();
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);

async function clickNav(label) {
  // Click sidebar nav button by text
  await page.locator(`aside button:has-text("${label}")`).first().click();
  await page.waitForTimeout(2000);
}

async function shot(filename) {
  const path = join(OUT, filename);
  await page.screenshot({ path, fullPage: false });
  console.log(`  ✓  ${filename}`);
}

// Today (default — already loaded)
await shot("phase-today.png");

// Decide
await clickNav("Decide");
await shot("phase4-decide.png");

// Workforce
await clickNav("Workforce");
await shot("phase-workforce.png");

// Projects
await clickNav("Projects");
await shot("phase5-projects.png");

// Life
await clickNav("Life");
await shot("phase-life.png");

await ctx.close();
await browser.close();
console.log(`\nScreenshots saved to: ${OUT}`);
