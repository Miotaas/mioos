import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const leads = await prisma.lead.findMany({
      include: { recommendedProduct: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(leads);
  } catch {
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const lead = await prisma.lead.create({
      data: {
        companyName: body.companyName,
        contactName: body.contactName ?? null,
        email: body.email ?? null,
        phone: body.phone ?? null,
        website: body.website ?? null,
        linkedin: body.linkedin ?? null,
        industry: body.industry ?? null,
        companySize: body.companySize ?? null,
        painPoint: body.painPoint ?? null,
        recommendedProductId: body.recommendedProductId ?? null,
        leadSource: body.leadSource ?? "manual",
        status: body.status ?? "new",
        priority: body.priority ?? "medium",
        estimatedValue: body.estimatedValue ? parseFloat(body.estimatedValue) : null,
        notes: body.notes ?? null,
        nextAction: body.nextAction ?? null,
        nextActionDate: body.nextActionDate ? new Date(body.nextActionDate) : null,
      },
      include: { recommendedProduct: true },
    });
    return NextResponse.json(lead, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}
