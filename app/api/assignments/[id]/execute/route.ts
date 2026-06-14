import { NextRequest, NextResponse } from "next/server";
import { executeAssignment } from "@/lib/workforce/executor";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const result = await executeAssignment(id);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Execution failed";
    console.error(`[POST /api/assignments/${id}/execute]`, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
