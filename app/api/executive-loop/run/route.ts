import { NextRequest, NextResponse } from "next/server";
import { runExecutiveLoop } from "@/lib/executiveLoop";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const triggerType = body.triggerType ?? "manual";

    const result = await runExecutiveLoop(triggerType);

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to run executive loop";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
