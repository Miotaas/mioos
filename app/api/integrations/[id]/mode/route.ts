import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getConnectorDef, ConnectorMode } from "@/lib/integrations/connector-catalog";

const VALID_MODES: ConnectorMode[] = [
  "disabled",
  "draft_only",
  "approval_required",
  "autonomous_limited",
];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: slug } = await params;
  const def = getConnectorDef(slug);
  if (!def) {
    return NextResponse.json({ error: "Unknown connector" }, { status: 404 });
  }

  const body = await req.json() as { mode?: string };
  const mode = body.mode as ConnectorMode | undefined;

  if (!mode || !VALID_MODES.includes(mode)) {
    return NextResponse.json(
      { error: `Invalid mode. Use one of: ${VALID_MODES.join(", ")}` },
      { status: 400 }
    );
  }

  // Safety gate: autonomous_limited is blocked for high-risk connectors
  const highRiskSlugs = ["meta-ads", "google-ads", "smtp", "broker-api", "exchange-api"];
  if (mode === "autonomous_limited" && highRiskSlugs.includes(slug)) {
    return NextResponse.json(
      { error: "Autonomous limited mode is not allowed for this connector. Use approval_required." },
      { status: 403 }
    );
  }

  const record = await prisma.connectorConfig.upsert({
    where:  { slug },
    update: { mode },
    create: { slug, status: "not_connected", mode },
  });

  return NextResponse.json({ slug: record.slug, mode: record.mode });
}
