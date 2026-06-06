import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeNextRunAt } from "@/lib/agentEngine";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const agentId = url.searchParams.get("agentId");
    if (agentId) {
      const schedule = await prisma.agentSchedule.findUnique({ where: { agentId } });
      return NextResponse.json(schedule);
    }
    const schedules = await prisma.agentSchedule.findMany({
      include: { agent: { select: { id: true, name: true, slug: true, status: true } } },
      orderBy: { nextRunAt: "asc" },
    });
    return NextResponse.json(schedules);
  } catch {
    return NextResponse.json({ error: "Failed to fetch schedules" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.agentId) return NextResponse.json({ error: "agentId is required" }, { status: 400 });

    const nextRunAt =
      body.enabled && body.frequency && body.frequency !== "manual"
        ? computeNextRunAt(body.frequency, body.timeOfDay ?? null)
        : null;

    const schedule = await prisma.agentSchedule.upsert({
      where: { agentId: body.agentId },
      update: {
        enabled: body.enabled ?? false,
        frequency: body.frequency ?? "manual",
        timeOfDay: body.timeOfDay ?? null,
        nextRunAt,
      },
      create: {
        agentId: body.agentId,
        enabled: body.enabled ?? false,
        frequency: body.frequency ?? "manual",
        timeOfDay: body.timeOfDay ?? null,
        nextRunAt,
      },
    });
    return NextResponse.json(schedule);
  } catch {
    return NextResponse.json({ error: "Failed to update schedule" }, { status: 500 });
  }
}
