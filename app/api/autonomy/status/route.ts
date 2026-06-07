import { NextRequest, NextResponse } from "next/server";
import { isAutonomyPaused, setAutonomyPaused } from "@/lib/autonomy";
import { auditLog } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const paused = await isAutonomyPaused();
    return NextResponse.json({ paused });
  } catch {
    return NextResponse.json({ error: "Failed to read autonomy status" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const paused = Boolean(body.paused);
    await setAutonomyPaused(paused);
    await auditLog("system", "autonomy", paused ? "autonomy_paused" : "autonomy_resumed", {
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({ paused });
  } catch {
    return NextResponse.json({ error: "Failed to update autonomy status" }, { status: 500 });
  }
}
