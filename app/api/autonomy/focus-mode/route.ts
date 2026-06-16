import { NextRequest, NextResponse } from "next/server";
import {
  getThrottleStatus,
  setFounderFocusMode,
  type FocusMode,
} from "@/lib/autonomy-throttle";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = await getThrottleStatus();
    return NextResponse.json(status);
  } catch {
    return NextResponse.json({ error: "Failed to read throttle status" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { mode: FocusMode };
    const valid: FocusMode[] = ["conservative", "normal", "aggressive"];
    if (!valid.includes(body.mode)) {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }
    await setFounderFocusMode(body.mode);
    return NextResponse.json({ ok: true, mode: body.mode });
  } catch {
    return NextResponse.json({ error: "Failed to update focus mode" }, { status: 500 });
  }
}
