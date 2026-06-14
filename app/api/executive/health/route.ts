import { NextResponse } from "next/server";
import { getAllProjectHealth } from "@/lib/executive/executive-health";

export async function GET() {
  try {
    const health = await getAllProjectHealth();
    return NextResponse.json(health);
  } catch (error) {
    console.error("[executive/health]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
