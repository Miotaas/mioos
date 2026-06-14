import { NextResponse } from "next/server";
import { getAllProjectHealth } from "@/lib/executive/executive-health";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const projectHealth = await getAllProjectHealth();

    const risks = projectHealth
      .filter(p => p.health.status === "critical" || p.health.status === "warning")
      .sort((a, b) => a.health.score - b.health.score)
      .slice(0, 3)
      .map(p => ({
        name: p.name,
        health: p.health.status,
        score: p.health.score,
        reasons: p.health.reasons,
        blocker: p.blocker,
        nextAction: p.nextAction,
        status: p.status,
      }));

    return NextResponse.json(risks);
  } catch (err) {
    console.error("[projects/risks]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
