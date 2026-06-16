/**
 * Screenshot script for MioOS Today view visual review.
 * Uses the dev fallback session secret to bypass login.
 */
import { chromium } from "playwright";
import { webcrypto } from "crypto";
import { mkdirSync } from "fs";
import { join } from "path";

const SECRET = "dev-only-insecure-secret-set-SESSION_SECRET-in-production";
const BASE   = "http://localhost:3000";
const OUT    = join(import.meta.dirname, "../screenshots");

mkdirSync(OUT, { recursive: true });

// ── generate session token (mirrors lib/auth.ts) ──────────────────
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

// ── screenshot helper ─────────────────────────────────────────────
async function shot(page, name, clip) {
  const path = join(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: !clip, clip });
  console.log(`  ✓  ${name}.png`);
  return path;
}

// ── main ─────────────────────────────────────────────────────────
const token = await createToken(SECRET);
console.log("Session token generated");

const browser = await chromium.launch({ headless: true });

// ── Desktop screenshots ──────────────────────────────────────────
{
  const ctx  = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([{
    name: "mioos-session", value: token,
    domain: "localhost", path: "/",
    httpOnly: true, sameSite: "Strict",
  }]);
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });

  // Make sure we're on Today (set activeView via localStorage workaround isn't needed
  // since default is now "today")
  await page.waitForSelector("text=Command Center", { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1500); // let data load

  console.log("\nDesktop screenshots (1440×900):");
  await shot(page, "01-today-desktop-full");

  // Section clips — locate each section heading
  const sections = {
    "02-morning-brief":   "text=Morning Brief",
    "03-attention":       "text=Attention",
    "04-personal-agenda": "text=Personal Agenda",
    "05-focus":           "text=Recommended Focus",
    "06-project-pulse":   "text=Project Pulse",
    "07-revenue-signal":  "text=Revenue Signal",
    "08-ai-outputs":      "text=AI Outputs",
  };

  for (const [name, selector] of Object.entries(sections)) {
    try {
      const el = page.locator(selector).first();
      await el.waitFor({ timeout: 3000 });
      const card = el.locator("..").locator(".."); // go up to card wrapper
      const box  = await card.boundingBox();
      if (box) {
        // Expand clip a little for context
        await shot(page, name, {
          x: Math.max(0, box.x - 8),
          y: Math.max(0, box.y - 8),
          width:  Math.min(1440, box.width  + 16),
          height: Math.min(900,  box.height + 16),
        });
      }
    } catch {
      console.log(`  ⚠  ${name} — section not found, skipping clip`);
    }
  }

  // Quick Dispatch modal
  const dispatchBtn = page.getByText("Dispatch Work").first();
  await dispatchBtn.click().catch(() => {});
  await page.waitForTimeout(500);
  await shot(page, "09-dispatch-modal");

  await ctx.close();
}

// ── Mobile screenshots ───────────────────────────────────────────
{
  const ctx  = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addCookies([{
    name: "mioos-session", value: token,
    domain: "localhost", path: "/",
    httpOnly: true, sameSite: "Strict",
  }]);
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  console.log("\nMobile screenshots (390×844):");
  await shot(page, "10-today-mobile-full");

  await ctx.close();
}

await browser.close();
console.log(`\nAll screenshots saved to: ${OUT}`);
