import { NextResponse } from "next/server";
import { getRevenueIntelligence } from "@/lib/executive/executive-analysis";

export async function GET() {
  try {
    const intel = await getRevenueIntelligence();
    return NextResponse.json(intel);
  } catch (error) {
    console.error("[executive/revenue]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
