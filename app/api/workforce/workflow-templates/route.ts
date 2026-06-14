import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const templates = await prisma.workflowTemplate.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(templates);
  } catch (error) {
    console.error("[workforce/workflow-templates GET]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name || !body.slug || !body.steps) {
      return NextResponse.json({ error: "name, slug, and steps are required" }, { status: 400 });
    }

    const template = await prisma.workflowTemplate.create({
      data: {
        name:        body.name,
        slug:        body.slug,
        description: body.description || null,
        steps:       typeof body.steps === "string" ? body.steps : JSON.stringify(body.steps),
        category:    body.category || "general",
        active:      body.active !== false,
      },
    });
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("[workforce/workflow-templates POST]", error);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
