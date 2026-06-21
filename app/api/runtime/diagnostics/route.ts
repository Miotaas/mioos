import { NextResponse } from "next/server";
import { getRuntimeDiagnostics } from "@/lib/runtime-diagnostics";

export const dynamic = "force-dynamic";

// GET /api/runtime/diagnostics — confirms a fresh deploy is producing work.
export async function GET() {
  try {
    const diagnostics = await getRuntimeDiagnostics();
    return NextResponse.json(diagnostics);
  } catch (err) {
    console.error("[api/runtime/diagnostics] error:", err);
    return NextResponse.json({ error: "Failed to load runtime diagnostics" }, { status: 500 });
  }
}
