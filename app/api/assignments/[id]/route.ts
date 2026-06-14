import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const VALID_STATUSES = ["pending", "queued", "active", "running", "review", "completed", "failed", "archived"];
const VALID_PRIORITIES = ["low", "medium", "high", "urgent"];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        team: { select: { id: true, name: true, slug: true, departmentType: true } },
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(assignment);
  } catch (error) {
    console.error("[assignments/:id GET]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};

    if ("title" in body)       data.title       = String(body.title).trim();
    if ("description" in body) data.description = body.description || null;
    if ("projectId" in body)   data.projectId   = body.projectId   || null;
    if ("goalId" in body)      data.goalId       = body.goalId      || null;
    if ("revenueEntryId" in body) data.revenueEntryId = body.revenueEntryId || null;

    if ("priority" in body && VALID_PRIORITIES.includes(body.priority)) {
      data.priority = body.priority;
    }

    if ("status" in body) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      data.status = body.status;
      if (body.status === "active" || body.status === "review") {
        const existing = await prisma.assignment.findUnique({ where: { id }, select: { startedAt: true } });
        if (!existing?.startedAt) data.startedAt = new Date();
      }
      if (body.status === "completed") data.completedAt = new Date();
    }

    const assignment = await prisma.assignment.update({
      where: { id },
      data,
      include: {
        team: { select: { id: true, name: true, slug: true, departmentType: true } },
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    return NextResponse.json(assignment);
  } catch (error) {
    console.error("[assignments/:id PATCH]", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.assignment.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[assignments/:id DELETE]", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
