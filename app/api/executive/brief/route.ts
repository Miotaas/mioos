import { NextResponse } from "next/server";
import { generateMorningBrief } from "@/lib/executive/executive-agent";

export async function GET() {
  try {
    const brief = await generateMorningBrief();
    return NextResponse.json(brief);
  } catch (error) {
    console.error("[executive/brief]", error);
    return NextResponse.json({ error: "Failed to generate brief" }, { status: 500 });
  }
}
