import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const VALID_SOURCES = ["chatgpt", "claude", "manual", "whatsapp", "email", "meeting", "other"];
const VALID_TYPES = ["note", "task", "idea", "decision", "bug", "roadmap", "goal", "project_update", "sales_note", "technical_note"];
const VALID_STATUSES = ["inbox", "processed", "archived"];
const VALID_PRIORITIES = ["low", "medium", "high", "urgent"];

function normalizeTags(raw: unknown): string | null {
  if (!raw) return null;
  let arr: string[] = [];
  if (Array.isArray(raw)) {
    arr = raw.map((t) => String(t).trim()).filter(Boolean);
  } else if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        arr = parsed.map((t: unknown) => String(t).trim()).filter(Boolean);
      } else {
        arr = raw.split(",").map((t) => t.trim()).filter(Boolean);
      }
    } catch {
      arr = raw.split(",").map((t) => t.trim()).filter(Boolean);
    }
  }
  return arr.length ? JSON.stringify(arr) : null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const capture = await prisma.capture.findUnique({ where: { id } });
    if (!capture) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(capture);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = (body.title as string)?.trim() || "Untitled Capture";
    if (body.content !== undefined) {
      const trimmed = (body.content as string)?.trim();
      if (!trimmed) {
        return NextResponse.json({ error: "content cannot be empty" }, { status: 400 });
      }
      data.content = trimmed;
    }
    if (body.source !== undefined) data.source = VALID_SOURCES.includes(body.source) ? body.source : "manual";
    if (body.type !== undefined) data.type = VALID_TYPES.includes(body.type) ? body.type : "note";
    if (body.status !== undefined) data.status = VALID_STATUSES.includes(body.status) ? body.status : "inbox";
    if (body.priority !== undefined) data.priority = VALID_PRIORITIES.includes(body.priority) ? body.priority : "medium";
    if (body.tags !== undefined) data.tags = normalizeTags(body.tags);
    if (body.nodeId !== undefined) data.nodeId = body.nodeId || null;
    if (body.convertedToType !== undefined) data.convertedToType = body.convertedToType || null;
    if (body.convertedToId !== undefined) data.convertedToId = body.convertedToId || null;

    const capture = await prisma.capture.update({ where: { id }, data });
    return NextResponse.json(capture);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await prisma.capture.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.capture.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/capture/[id]]", e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
