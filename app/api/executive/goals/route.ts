import { NextResponse } from "next/server";
import { getGoalIntelligence } from "@/lib/executive/executive-analysis";

export async function GET() {
  try {
    const goals = await getGoalIntelligence();
    return NextResponse.json(goals);
  } catch (error) {
    console.error("[executive/goals]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
