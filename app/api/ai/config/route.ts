import { NextResponse } from "next/server";
import { getAIConfig } from "@/lib/ai/provider";

export async function GET() {
  try {
    const config = getAIConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error("[ai/config GET]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
