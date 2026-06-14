import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const VALID_STATUSES = ["pending", "queued", "active", "running", "review", "completed", "failed", "archived"];
const VALID_PRIORITIES = ["low", "medium", "high", "urgent"];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const teamId     = searchParams.get("teamId")     ?? undefined;
    const projectId  = searchParams.get("projectId")  ?? undefined;
    const status     = searchParams.get("status")     ?? undefined;

    const assignments = await prisma.assignment.findMany({
      where: {
        ...(teamId    ? { teamId }    : {}),
        ...(projectId ? { projectId } : {}),
        ...(status    ? { status }    : {}),
      },
      include: {
        team: { select: { id: true, name: true, slug: true, departmentType: true } },
        messages: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error("[assignments GET]", error);
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.title || typeof body.title !== "string") {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    if (!body.teamId || typeof body.teamId !== "string") {
      return NextResponse.json({ error: "teamId is required" }, { status: 400 });
    }

    const team = await prisma.workforceTeam.findUnique({ where: { id: body.teamId } });
    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

    const status   = VALID_STATUSES.includes(body.status)   ? body.status   : "pending";
    const priority = VALID_PRIORITIES.includes(body.priority) ? body.priority : "medium";

    const assignment = await prisma.assignment.create({
      data: {
        title:          body.title.trim(),
        description:    (body.description as string | null | undefined) || null,
        status,
        teamId:         body.teamId,
        projectId:      (body.projectId as string | null | undefined)  || null,
        goalId:         (body.goalId as string | null | undefined)      || null,
        revenueEntryId: (body.revenueEntryId as string | null | undefined) || null,
        priority,
      },
      include: {
        team: { select: { id: true, name: true, slug: true, departmentType: true } },
        messages: true,
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error("[assignments POST]", error);
    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 });
  }
}
