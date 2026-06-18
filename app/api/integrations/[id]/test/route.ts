import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getConnectorDef } from "@/lib/integrations/connector-catalog";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: slug } = await params;
  const def = getConnectorDef(slug);
  if (!def) {
    return NextResponse.json({ error: "Unknown connector" }, { status: 404 });
  }

  // No env keys needed = always passes (e.g., paper-trading)
  if (def.envKeys.length === 0) {
    await prisma.connectorConfig.upsert({
      where:  { slug },
      update: { status: "connected", lastTestedAt: new Date(), lastError: null },
      create: { slug, status: "connected", mode: def.defaultMode, lastTestedAt: new Date() },
    });
    return NextResponse.json({ ok: true, message: "No external connection required. Always available." });
  }

  const missingKeys = def.envKeys.filter(k => !process.env[k]);
  if (missingKeys.length > 0) {
    await prisma.connectorConfig.upsert({
      where:  { slug },
      update: { status: "error", lastError: `Missing env: ${missingKeys.join(", ")}`, lastTestedAt: new Date() },
      create: { slug, status: "error", mode: def.defaultMode, lastError: `Missing env: ${missingKeys.join(", ")}`, lastTestedAt: new Date() },
    });
    return NextResponse.json(
      { ok: false, message: `Missing environment variables: ${missingKeys.join(", ")}` },
      { status: 422 }
    );
  }

  // For placeholder connectors, env vars being present is sufficient to report "ready"
  if (def.isPlaceholder) {
    await prisma.connectorConfig.upsert({
      where:  { slug },
      update: { status: "connected", lastTestedAt: new Date(), lastError: null },
      create: { slug, status: "connected", mode: def.defaultMode, lastTestedAt: new Date() },
    });
    return NextResponse.json({
      ok:      true,
      message: "Environment variables are set. Live connection test not yet implemented for this connector.",
    });
  }

  // Real connectivity tests for implemented connectors
  try {
    let testResult: string;

    switch (slug) {
      case "shopify": {
        const domain = process.env.SHOPIFY_STORE_DOMAIN!;
        const token  = process.env.SHOPIFY_ACCESS_TOKEN!;
        const res = await fetch(`https://${domain}/admin/api/2024-01/shop.json`, {
          headers: { "X-Shopify-Access-Token": token },
          signal:  AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error(`Shopify API returned ${res.status}`);
        testResult = "Shopify store connected.";
        break;
      }
      case "stripe": {
        const res = await fetch("https://api.stripe.com/v1/balance", {
          headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
          signal:  AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error(`Stripe API returned ${res.status}`);
        testResult = "Stripe account accessible.";
        break;
      }
      default:
        // Implemented but no live test yet — env vars are confirmed present
        testResult = "Environment variables verified. Live endpoint test not yet implemented.";
    }

    const first = process.env[def.envKeys[0]] ?? "";
    const maskedHint = first.length >= 4 ? `••••${first.slice(-4)}` : null;

    await prisma.connectorConfig.upsert({
      where:  { slug },
      update: { status: "connected", maskedHint, lastTestedAt: new Date(), lastError: null },
      create: { slug, status: "connected", mode: def.defaultMode, maskedHint, lastTestedAt: new Date() },
    });

    return NextResponse.json({ ok: true, message: testResult });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.connectorConfig.upsert({
      where:  { slug },
      update: { status: "error", lastError: message, lastTestedAt: new Date() },
      create: { slug, status: "error", mode: def.defaultMode, lastError: message, lastTestedAt: new Date() },
    });
    return NextResponse.json({ ok: false, message }, { status: 502 });
  }
}
