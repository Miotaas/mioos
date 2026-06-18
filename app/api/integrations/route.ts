import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CONNECTOR_CATALOG } from "@/lib/integrations/connector-catalog";

export async function GET() {
  try {
    // Load all DB records in one query
    const records = await prisma.connectorConfig.findMany();
    const recordMap = new Map(records.map(r => [r.slug, r]));

    // Merge catalog (static) with DB state (dynamic)
    const connectors = CONNECTOR_CATALOG.map(def => {
      const db = recordMap.get(def.slug);
      return {
        slug:          def.slug,
        name:          def.name,
        category:      def.category,
        categoryLabel: def.categoryLabel,
        authType:      def.authType,
        description:   def.description,
        safetyNote:    def.safetyNote,
        isPlaceholder: def.isPlaceholder,
        envKeys:       def.envKeys,
        // Runtime state from DB (safe to expose — no secrets)
        status:        db?.status       ?? "not_connected",
        mode:          db?.mode         ?? def.defaultMode,
        maskedHint:    db?.maskedHint   ?? null,
        lastTestedAt:  db?.lastTestedAt ?? null,
        lastSyncAt:    db?.lastSyncAt   ?? null,
        lastError:     db?.lastError    ?? null,
      };
    });

    return NextResponse.json({ connectors });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
