import { NextRequest } from "next/server";
import { createSessionToken, getSessionSecret, sessionCookieHeader } from "@/lib/auth";
import { checkRateLimit, resetRateLimit } from "@/lib/rateLimit";

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function json(body: object, status = 200, extra?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...extra },
  });
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);

  // Brute-force protection
  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    return json(
      { error: "Too many login attempts. Please wait and try again." },
      429,
      { "Retry-After": String(rl.retryAfter) }
    );
  }

  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const expectedUser = process.env.MIOOS_USERNAME;
  const expectedPass = process.env.MIOOS_PASSWORD;

  if (!expectedUser || !expectedPass) {
    console.error("[MioOS] MIOOS_USERNAME and MIOOS_PASSWORD must be set");
    return json({ error: "Server not configured for authentication" }, 500);
  }

  if (body.username !== expectedUser || body.password !== expectedPass) {
    return json({ error: "Invalid username or password" }, 401);
  }

  // Success — reset rate limit, issue session
  resetRateLimit(ip);
  const token = await createSessionToken(getSessionSecret());

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": sessionCookieHeader(token),
    },
  });
}
