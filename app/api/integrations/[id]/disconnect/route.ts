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

  await prisma.connectorConfig.upsert({
    where:  { slug },
    update: {
      status:      "not_connected",
      maskedHint:  null,
      lastError:   null,
      lastSyncAt:  null,
      mode:        "disabled",
    },
    create: {
      slug,
      status: "not_connected",
      mode:   "disabled",
    },
  });

  return NextResponse.json({ slug, status: "not_connected", mode: "disabled" });
}
