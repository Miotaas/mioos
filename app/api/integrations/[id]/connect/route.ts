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

  // Connectors with no env keys (e.g., paper-trading) are always "connectable"
  const allSet = def.envKeys.length === 0 || def.envKeys.every(k => !!process.env[k]);
  const missingKeys = def.envKeys.filter(k => !process.env[k]);

  if (!allSet) {
    return NextResponse.json(
      {
        error:       "Missing environment variables",
        missingKeys,
        instruction: `Set ${missingKeys.join(", ")} in your .env.local to connect this integration.`,
      },
      { status: 422 }
    );
  }

  // Compute a masked hint from the first available env key (last 4 chars)
  let maskedHint: string | null = null;
  if (def.envKeys.length > 0) {
    const firstKey = process.env[def.envKeys[0]] ?? "";
    if (firstKey.length >= 4) {
      maskedHint = `••••${firstKey.slice(-4)}`;
    }
  }

  const record = await prisma.connectorConfig.upsert({
    where:  { slug },
    update: { status: "connected", maskedHint, lastError: null, lastTestedAt: new Date() },
    create: {
      slug,
      status:    "connected",
      mode:      def.defaultMode,
      maskedHint,
      lastTestedAt: new Date(),
    },
  });

  return NextResponse.json({
    slug:        record.slug,
    status:      record.status,
    mode:        record.mode,
    maskedHint:  record.maskedHint,
    lastTestedAt: record.lastTestedAt,
  });
}
