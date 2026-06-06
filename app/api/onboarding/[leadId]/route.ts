import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const DEFAULT_CHECKLIST = [
  "Collect company details",
  "Confirm selected AI product",
  "Confirm use case",
  "Collect sample data",
  "Configure demo/workflow",
  "Run internal test",
  "Schedule client walkthrough",
  "Client approval",
  "Go live",
  "First week check-in",
  "Collect feedback",
  "Identify upsell opportunity",
];

export async function GET(_: Request, { params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  try {
    let items = await prisma.onboardingItem.findMany({
      where: { leadId },
      orderBy: { order: "asc" },
    });

    // Auto-create default checklist if empty
    if (items.length === 0) {
      await prisma.onboardingItem.createMany({
        data: DEFAULT_CHECKLIST.map((text, i) => ({ leadId, text, order: i })),
      });
      items = await prisma.onboardingItem.findMany({
        where: { leadId },
        orderBy: { order: "asc" },
      });
    }

    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Failed to fetch onboarding items" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  try {
    const body = await req.json();
    const count = await prisma.onboardingItem.count({ where: { leadId } });
    const item = await prisma.onboardingItem.create({
      data: { leadId, text: body.text, order: count },
    });
    return NextResponse.json(item, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create onboarding item" }, { status: 500 });
  }
}
