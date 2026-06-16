import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const artifact = await prisma.artifact.findUnique({ where: { id } });
    if (!artifact) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(artifact);
  } catch (err) {
    console.error("[artifacts/[id] GET]", err);
    return NextResponse.json({ error: "Failed to fetch artifact" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id }  = await params;
    const body    = await req.json();
    const allowed = ["title", "content", "status", "projectId", "goalId", "opportunityId"];

    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) data[key] = body[key];
    }
    if ("metadata" in body) data.metadata = JSON.stringify(body.metadata);

    const updated = await prisma.artifact.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[artifacts/[id] PATCH]", err);
    return NextResponse.json({ error: "Failed to update artifact" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await prisma.artifact.update({ where: { id }, data: { status: "archived" } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[artifacts/[id] DELETE]", err);
    return NextResponse.json({ error: "Failed to archive artifact" }, { status: 500 });
  }
}
