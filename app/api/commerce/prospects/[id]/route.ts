import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const item = await prisma.prospect.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Failed to fetch prospect" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const item = await prisma.prospect.update({
      where: { id },
      data: {
        ...(body.companyName !== undefined && { companyName: body.companyName }),
        ...(body.contactName !== undefined && { contactName: body.contactName }),
        ...(body.role !== undefined && { role: body.role }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.linkedinUrl !== undefined && { linkedinUrl: body.linkedinUrl }),
        ...(body.website !== undefined && { website: body.website }),
        ...(body.industry !== undefined && { industry: body.industry }),
        ...(body.country !== undefined && { country: body.country }),
        ...(body.companySize !== undefined && { companySize: body.companySize }),
        ...(body.fitScore !== undefined && { fitScore: body.fitScore != null ? parseInt(body.fitScore) : null }),
        ...(body.painPointHypothesis !== undefined && { painPointHypothesis: body.painPointHypothesis }),
        ...(body.suggestedOffer !== undefined && { suggestedOffer: body.suggestedOffer }),
        ...(body.source !== undefined && { source: body.source }),
        ...(body.status !== undefined && { status: body.status }),
      },
    });
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Failed to update prospect" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.prospect.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete prospect" }, { status: 500 });
  }
}
