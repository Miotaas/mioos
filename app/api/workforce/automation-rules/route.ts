import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const rules = await prisma.automationRule.findMany({
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(rules);
  } catch (e) {
    console.error("[GET /api/workforce/automation-rules]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name || !body.trigger || !body.action || !body.actionConfig) {
      return NextResponse.json({ error: "name, trigger, action, actionConfig required" }, { status: 400 });
    }
    const rule = await prisma.automationRule.create({
      data: {
        name:         String(body.name),
        trigger:      String(body.trigger),
        condition:    body.condition ? JSON.stringify(body.condition) : null,
        action:       String(body.action),
        actionConfig: JSON.stringify(body.actionConfig),
        active:       body.active !== false,
      },
    });
    return NextResponse.json(rule, { status: 201 });
  } catch (e) {
    console.error("[POST /api/workforce/automation-rules]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const rule = await prisma.automationRule.update({
      where: { id: body.id },
      data: {
        ...(body.name       !== undefined ? { name: String(body.name) }     : {}),
        ...(body.active     !== undefined ? { active: Boolean(body.active) } : {}),
        ...(body.condition  !== undefined ? { condition: body.condition ? JSON.stringify(body.condition) : null } : {}),
        ...(body.actionConfig !== undefined ? { actionConfig: JSON.stringify(body.actionConfig) } : {}),
      },
    });
    return NextResponse.json(rule);
  } catch (e) {
    console.error("[PATCH /api/workforce/automation-rules]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
