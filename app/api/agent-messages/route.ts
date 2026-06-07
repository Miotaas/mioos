import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? undefined;
    const fromAgentId = url.searchParams.get("fromAgentId") ?? undefined;
    const toAgentId = url.searchParams.get("toAgentId") ?? undefined;
    const take = Math.min(100, Number(url.searchParams.get("take") ?? 50));

    const messages = await prisma.agentMessage.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(fromAgentId ? { fromAgentId } : {}),
        ...(toAgentId ? { toAgentId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
    });

    return NextResponse.json(messages);
  } catch {
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.fromAgentId) return NextResponse.json({ error: "fromAgentId required" }, { status: 400 });
    if (!body.toAgentId) return NextResponse.json({ error: "toAgentId required" }, { status: 400 });
    if (!body.subject?.trim()) return NextResponse.json({ error: "subject required" }, { status: 400 });
    if (!body.content?.trim()) return NextResponse.json({ error: "content required" }, { status: 400 });

    const message = await prisma.agentMessage.create({
      data: {
        fromAgentId: body.fromAgentId,
        toAgentId: body.toAgentId,
        subject: body.subject.trim(),
        content: body.content.trim(),
        context: body.context ? JSON.stringify(body.context) : null,
        priority: body.priority ?? "medium",
        status: "unread",
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create message" }, { status: 500 });
  }
}
