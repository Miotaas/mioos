import { NextRequest, NextResponse } from "next/server";
import { executeAgent } from "@/lib/agentEngine";

export async function POST(req: NextRequest) {
  try {
    const { agentId } = await req.json();
    if (!agentId) return NextResponse.json({ error: "agentId is required" }, { status: 400 });
    const runId = await executeAgent(agentId);
    return NextResponse.json({ runId }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Execution failed" },
      { status: 500 },
    );
  }
}
