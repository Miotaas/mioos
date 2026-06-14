import { NextResponse } from "next/server";
import { getWorkforcePerformance } from "@/lib/executive/executive-analysis";

export async function GET() {
  try {
    const perf = await getWorkforcePerformance();
    return NextResponse.json(perf);
  } catch (error) {
    console.error("[executive/workforce]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
