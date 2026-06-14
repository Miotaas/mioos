import { NextResponse } from "next/server";
import { getRuntimeHealth } from "@/lib/runtime-status";

export async function GET() {
  try {
    const health = await getRuntimeHealth();
    return NextResponse.json(health);
  } catch (err) {
    return NextResponse.json(
      { status: "offline", error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
