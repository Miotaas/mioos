import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE, getSessionSecretSafe } from "@/lib/auth";

// Paths that never require authentication
const PUBLIC_EXACT = new Set(["/login", "/api/auth/login", "/api/auth/logout", "/api/health"]);
const PUBLIC_PREFIX = ["/_next/", "/favicon"];

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIX.some((p) => pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const token  = req.cookies.get(SESSION_COOKIE)?.value ?? "";
  const secret = getSessionSecretSafe();

  if (token && (await verifySessionToken(token, secret))) {
    return NextResponse.next();
  }

  // API routes → 401 JSON
  if (pathname.startsWith("/api/")) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Page routes → redirect to /login, preserve intended destination
  const url = new URL("/login", req.url);
  if (pathname !== "/") url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Match all routes except static files
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
