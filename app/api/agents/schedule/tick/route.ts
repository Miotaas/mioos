import { NextResponse } from "next/server";
import { runDueSchedules } from "@/lib/scheduleRunner";

// Called by instrumentation.ts every 60 seconds.
// Also invoked by the Schedules UI on mount as a manual fallback.
export async function POST() {
  try {
    const result = await runDueSchedules();
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Scheduler tick failed" }, { status: 500 });
  }
}
