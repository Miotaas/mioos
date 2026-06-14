import { NextResponse } from "next/server";
import { generateRecommendations } from "@/lib/executive/executive-recommendations";

export async function GET() {
  try {
    const recs = await generateRecommendations();
    return NextResponse.json(recs);
  } catch (error) {
    console.error("[executive/recommendations]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
