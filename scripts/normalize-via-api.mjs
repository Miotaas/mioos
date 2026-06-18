/**
 * Calls /api/admin/normalize-teams with auth cookie so the Next.js app
 * writes to the correct database (same one the dev server uses).
 */
import { chromium } from "playwright";
import { webcrypto } from "crypto";

const SECRET = "dev-only-insecure-secret-set-SESSION_SECRET-in-production";
const BASE   = "http://localhost:3000";

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

const token   = await createToken(SECRET);
const browser = await chromium.launch({ headless: true });
const ctx     = await browser.newContext();
await ctx.addCookies([{ name: "mioos-session", value: token, domain: "localhost", path: "/", httpOnly: true, sameSite: "Strict" }]);

const page = await ctx.newPage();
const resp = await page.request.post(`${BASE}/api/admin/normalize-teams`);
const body = await resp.json();

console.log("Status:", resp.status());
console.log(JSON.stringify(body, null, 2));

await browser.close();
