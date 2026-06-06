import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// SECURITY: If CAPTURE_API_TOKEN is set in .env, all POST requests must include:
//   Authorization: Bearer <your-token>
// If the env var is not set, the endpoint is open (local dev only).
// See docs/integrations-roadmap.md for full security guidance.

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
    // Accept JSON array string or comma-separated string
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

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const nodeId = url.searchParams.get("nodeId");

    const captures = await prisma.capture.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(nodeId ? { nodeId } : {}),
      },
      orderBy: [{ createdAt: "desc" }],
    });
    return NextResponse.json(captures);
  } catch (e) {
    console.error("[GET /api/capture]", e);
    return NextResponse.json({ error: "Failed to fetch captures" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Optional token auth — only enforced when CAPTURE_API_TOKEN env var is set
  const apiToken = process.env.CAPTURE_API_TOKEN;
  if (apiToken) {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();
    if (!token || token !== apiToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const body = await req.json();

    // Validate required fields
    if (!body.content || typeof body.content !== "string" || !body.content.trim()) {
      return NextResponse.json(
        { error: "content is required and cannot be empty" },
        { status: 400 }
      );
    }

    const content = (body.content as string).trim();
    const title = (body.title as string)?.trim() || content.slice(0, 60) || "Untitled Capture";

    const capture = await prisma.capture.create({
      data: {
        title,
        content,
        source: VALID_SOURCES.includes(body.source) ? body.source : "manual",
        type: VALID_TYPES.includes(body.type) ? body.type : "note",
        status: VALID_STATUSES.includes(body.status) ? body.status : "inbox",
        priority: VALID_PRIORITIES.includes(body.priority) ? body.priority : "medium",
        tags: normalizeTags(body.tags),
        nodeId: (body.nodeId as string | null) || null,
      },
    });

    return NextResponse.json(capture, { status: 201 });
  } catch (e) {
    console.error("[POST /api/capture]", e);
    return NextResponse.json({ error: "Failed to create capture" }, { status: 500 });
  }
}
