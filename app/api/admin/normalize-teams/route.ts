import { NextResponse } from "next/server";

/**
 * DISABLED — this route previously seeded demo teams/outputs/approvals
 * ("Automation Sales Team", affiliate demos). Removed as a legacy demo source.
 * All workforce data now comes from seed + backfill + migrate-reality only.
 */
export async function POST() {
  return NextResponse.json(
    { error: "normalize-teams is disabled. Workforce data comes from db:migrate-reality, not demo seeding." },
    { status: 410 },
  );
}
