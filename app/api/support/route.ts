import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const issues = await prisma.supportIssue.findMany({
      include: { lead: true, product: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(issues);
  } catch {
    return NextResponse.json({ error: "Failed to fetch support issues" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const issue = await prisma.supportIssue.create({
      data: {
        title: body.title,
        description: body.description ?? null,
        severity: body.severity ?? "medium",
        status: body.status ?? "open",
        leadId: body.leadId ?? null,
        productId: body.productId ?? null,
        deploymentId: body.deploymentId ?? null,
      },
      include: { lead: true, product: true },
    });
    return NextResponse.json(issue, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create support issue" }, { status: 500 });
  }
}
