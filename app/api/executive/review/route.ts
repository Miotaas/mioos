import { NextResponse } from "next/server";
import { generateWeeklyReview, generateMonthlyReview } from "@/lib/executive/executive-agent";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "weekly";
  try {
    if (type === "monthly") {
      return NextResponse.json(await generateMonthlyReview());
    }
    return NextResponse.json(await generateWeeklyReview());
  } catch (error) {
    console.error("[executive/review]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
