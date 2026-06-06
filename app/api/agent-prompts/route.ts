import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET ?agentId=xxx — return full version history for an agent
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const agentId = url.searchParams.get("agentId");
    if (!agentId) return NextResponse.json({ error: "agentId is required" }, { status: 400 });

    const versions = await prisma.agentPromptVersion.findMany({
      where: { agentId },
      orderBy: { version: "desc" },
    });
    return NextResponse.json(versions);
  } catch {
    return NextResponse.json({ error: "Failed to fetch prompt versions" }, { status: 500 });
  }
}

// POST — save new version + update agent.systemPrompt / agent.prompt
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.agentId) return NextResponse.json({ error: "agentId is required" }, { status: 400 });

    // Compute next version number
    const latest = await prisma.agentPromptVersion.findFirst({
      where: { agentId: body.agentId },
      orderBy: { version: "desc" },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    // Save version record (append-only)
    const version = await prisma.agentPromptVersion.create({
      data: {
        agentId: body.agentId,
        version: nextVersion,
        systemPrompt: body.systemPrompt ?? null,
        userPromptTemplate: body.userPromptTemplate ?? null,
      },
    });

    // Update agent's live prompts
    await prisma.agent.update({
      where: { id: body.agentId },
      data: {
        systemPrompt: body.systemPrompt ?? null,
        prompt: body.userPromptTemplate ?? null,
      },
    });

    return NextResponse.json(version, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to save prompt version" }, { status: 500 });
  }
}

// PATCH — restore a specific version (creates a new version record for auditability)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.agentId) return NextResponse.json({ error: "agentId is required" }, { status: 400 });
    if (body.version === undefined) return NextResponse.json({ error: "version is required" }, { status: 400 });

    const source = await prisma.agentPromptVersion.findUnique({
      where: { agentId_version: { agentId: body.agentId, version: body.version } },
    });
    if (!source) return NextResponse.json({ error: "Version not found" }, { status: 404 });

    // Compute next version for the restore entry
    const latest = await prisma.agentPromptVersion.findFirst({
      where: { agentId: body.agentId },
      orderBy: { version: "desc" },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    const restored = await prisma.agentPromptVersion.create({
      data: {
        agentId: body.agentId,
        version: nextVersion,
        systemPrompt: source.systemPrompt,
        userPromptTemplate: source.userPromptTemplate,
      },
    });

    // Update agent's live prompts
    await prisma.agent.update({
      where: { id: body.agentId },
      data: {
        systemPrompt: source.systemPrompt,
        prompt: source.userPromptTemplate,
      },
    });

    return NextResponse.json(restored);
  } catch {
    return NextResponse.json({ error: "Failed to restore prompt version" }, { status: 500 });
  }
}
