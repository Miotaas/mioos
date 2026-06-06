/**
 * Session utilities — Web Crypto API only.
 * Compatible with both Edge Runtime (middleware) and Node.js runtime (API routes).
 */

export const SESSION_COOKIE = "mioos-session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ── base64url ─────────────────────────────────────────────────────

function encodeBase64url(bytes: Uint8Array): string {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function decodeBase64url(s: string): Uint8Array<ArrayBuffer> {
  const base64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  // Uint8Array.from returns Uint8Array<ArrayBuffer> — required by crypto.subtle APIs in TS 5.7+
  return Uint8Array.from({ length: binary.length }, (_, i) => binary.charCodeAt(i));
}

// ── HMAC key ──────────────────────────────────────────────────────

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

// ── token ─────────────────────────────────────────────────────────

export async function createSessionToken(secret: string): Promise<string> {
  const payload = JSON.stringify({ exp: Date.now() + SESSION_DURATION_MS });
  const payloadBytes = new TextEncoder().encode(payload);
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, payloadBytes);
  return `${encodeBase64url(payloadBytes)}.${encodeBase64url(new Uint8Array(sig))}`;
}

export async function verifySessionToken(
  token: string,
  secret: string
): Promise<boolean> {
  try {
    const dot = token.indexOf(".");
    if (dot === -1) return false;
    const payloadBytes = decodeBase64url(token.slice(0, dot));
    const sigBytes    = decodeBase64url(token.slice(dot + 1));
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as { exp: number };
    if (Date.now() > payload.exp) return false;
    const key = await importKey(secret);
    return crypto.subtle.verify("HMAC", key, sigBytes, payloadBytes);
  } catch {
    return false;
  }
}

// ── secret ────────────────────────────────────────────────────────

const DEV_FALLBACK = "dev-only-insecure-secret-set-SESSION_SECRET-in-production";

export function getSessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("[MioOS] SESSION_SECRET is required in production");
    }
    console.warn("[MioOS] SESSION_SECRET not set — using dev fallback (never use in production)");
    return DEV_FALLBACK;
  }
  return s;
}

/** Returns the effective secret for middleware (never throws — fails gracefully) */
export function getSessionSecretSafe(): string {
  return process.env.SESSION_SECRET ?? DEV_FALLBACK;
}

// ── cookie builder ────────────────────────────────────────────────

export function sessionCookieHeader(value: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${secure}`;
}

export function clearCookieHeader(): string {
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
}
