/**
 * Sidebar screenshot for V3 navigation review.
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
  const key      = await webcrypto.subtle.importKey(
    "raw", keyMat, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await webcrypto.subtle.sign("HMAC", key, payloadB);
  return `${encodeBase64url(payloadB)}.${encodeBase64url(new Uint8Array(sig))}`;
}

const token = await createToken(SECRET);
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

// Full page
const fullPath = join(OUT, "v3-sidebar-full.png");
await page.screenshot({ path: fullPath, fullPage: false });
console.log("  ✓  v3-sidebar-full.png");

// Sidebar only — the aside element
const sidebar = page.locator("aside").first();
await sidebar.waitFor({ timeout: 5000 });
const box = await sidebar.boundingBox();
if (box) {
  const sidebarPath = join(OUT, "v3-sidebar-only.png");
  await page.screenshot({ path: sidebarPath, clip: { x: box.x, y: box.y, width: box.width, height: box.height } });
  console.log("  ✓  v3-sidebar-only.png");

  // Expanded sidebar with some page context
  const contextPath = join(OUT, "v3-sidebar-context.png");
  await page.screenshot({ path: contextPath, clip: { x: 0, y: 0, width: Math.min(500, box.width + 300), height: 900 } });
  console.log("  ✓  v3-sidebar-context.png");
}

await ctx.close();
await browser.close();
console.log(`\nScreenshots saved to: ${OUT}`);
