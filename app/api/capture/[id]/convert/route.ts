import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { convertTo, nodeId, extraData, force } = body as {
      convertTo: "note" | "task" | "goal" | "node";
      nodeId?: string;
      extraData?: Record<string, unknown>;
      force?: boolean;
    };

    const VALID_CONVERT_TARGETS = ["note", "task", "goal", "node"];
    if (!VALID_CONVERT_TARGETS.includes(convertTo)) {
      return NextResponse.json({ error: "Invalid convertTo value" }, { status: 400 });
    }

    const capture = await prisma.capture.findUnique({ where: { id } });
    if (!capture) return NextResponse.json({ error: "Capture not found" }, { status: 404 });

    // Duplicate conversion protection: if already converted to same type, require force flag
    if (capture.convertedToType === convertTo && !force) {
      return NextResponse.json(
        {
          error: `Capture already converted to ${convertTo}. Pass force: true to create another.`,
          convertedToId: capture.convertedToId,
        },
        { status: 409 }
      );
    }

    const safeTitle = capture.title?.trim() || capture.content?.slice(0, 60) || "Untitled";

    let created: { id: string; [key: string]: unknown } | null = null;

    if (convertTo === "note") {
      created = await prisma.note.create({
        data: {
          title: safeTitle,
          content: capture.content,
          tags: capture.tags,
          nodeId: nodeId || capture.nodeId || null,
        },
      });
    } else if (convertTo === "task") {
      created = await prisma.task.create({
        data: {
          title: safeTitle,
          description: capture.content.slice(0, 500) || null,
          status: "todo",
          priority: capture.priority || "medium",
          nodeId: nodeId || capture.nodeId || null,
        },
      });
    } else if (convertTo === "goal") {
      created = await prisma.goal.create({
        data: {
          title: safeTitle,
          description: capture.content.slice(0, 500) || null,
          status: "active",
          progress: 0,
          nodeId: nodeId || capture.nodeId || null,
        },
      });
    } else if (convertTo === "node") {
      const label = (extraData?.label as string)?.trim() || safeTitle;
      const rawType = extraData?.type as string || "idea";
      const VALID_NODE_TYPES = ["project", "idea", "task", "goal", "note", "person", "workflow", "decision", "problem", "roadmap", "system"];
      const type = VALID_NODE_TYPES.includes(rawType) ? rawType : "idea";
      created = await prisma.node.create({
        data: {
          label,
          type,
          status: "inbox",
          description: capture.content.slice(0, 500) || null,
          priority: capture.priority || "medium",
          posX: 0,
          posY: 0,
        },
      });
    }

    // Mark capture as processed and store reference
    await prisma.capture.update({
      where: { id },
      data: {
        status: "processed",
        convertedToType: convertTo,
        convertedToId: created?.id || null,
      },
    });

    return NextResponse.json({ ok: true, created, convertedTo: convertTo });
  } catch (e) {
    console.error("[POST /api/capture/[id]/convert]", e);
    return NextResponse.json({ error: "Failed to convert capture" }, { status: 500 });
  }
}
