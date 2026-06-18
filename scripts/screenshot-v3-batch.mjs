/**
 * V3 batch screenshot: desktop sidebar + all 6 destinations + mobile nav.
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

async function shot(page, name, clip) {
  const path = join(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: !clip, clip });
  console.log(`  ✓  ${name}.png`);
  return path;
}

const token = await createToken(SECRET);
const browser = await chromium.launch({ headless: true });

// ── Desktop (1440×900) ───────────────────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([{
    name: "mioos-session", value: token,
    domain: "localhost", path: "/",
    httpOnly: true, sameSite: "Strict",
  }]);
  const page = await ctx.newPage();

  // Inject localStorage to set activeView and load the app
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  console.log("\nDesktop screenshots (1440×900):");

  // Sidebar only (Today active)
  const sidebar = await page.locator("aside").first();
  const sidebarBox = await sidebar.boundingBox();
  if (sidebarBox) {
    await shot(page, "v3-desktop-sidebar-today", {
      x: sidebarBox.x, y: sidebarBox.y,
      width: sidebarBox.width, height: sidebarBox.height
    });
    // Context: sidebar + first 400px of content
    await shot(page, "v3-desktop-sidebar-context-today", {
      x: 0, y: 0,
      width: Math.min(1440, sidebarBox.width + 400), height: 900
    });
  }

  // Click each V3 destination and screenshot the sidebar highlight + context
  const views = [
    { id: "decide",   label: "Decide"   },
    { id: "projects", label: "Projects" },
    { id: "life",     label: "Life"     },
    { id: "teams",    label: "Teams"    },
    { id: "settings", label: "Settings" },
  ];

  for (const { id, label } of views) {
    // Click sidebar nav button
    await page.locator(`aside button`, { hasText: label }).first().click();
    await page.waitForTimeout(600);
    const box = await page.locator("aside").first().boundingBox();
    if (box) {
      await shot(page, `v3-desktop-sidebar-${id}`, {
        x: 0, y: 0,
        width: Math.min(1440, box.width + 400), height: 900
      });
    }
  }

  await ctx.close();
}

// ── Mobile (390×844) ─────────────────────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addCookies([{
    name: "mioos-session", value: token,
    domain: "localhost", path: "/",
    httpOnly: true, sameSite: "Strict",
  }]);
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  console.log("\nMobile screenshots (390×844):");

  // Full page (Today + bottom tab bar visible)
  await shot(page, "v3-mobile-today-full");

  // Open the mobile nav drawer
  const menuBtn = page.getByLabel("Open navigation");
  await menuBtn.click();
  await page.waitForTimeout(500);
  await shot(page, "v3-mobile-drawer-open");

  await ctx.close();
}

await browser.close();
console.log(`\nAll screenshots saved to: ${OUT}`);
