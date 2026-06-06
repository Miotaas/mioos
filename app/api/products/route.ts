import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const products = await prisma.product.findMany({ orderBy: { createdAt: "asc" } });
    return NextResponse.json(products);
  } catch {
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const product = await prisma.product.create({
      data: {
        name: body.name,
        shortDescription: body.shortDescription ?? "",
        targetCustomers: body.targetCustomers ?? "",
        painPoints: body.painPoints ?? "",
        coreFeatures: body.coreFeatures ?? "[]",
        demoAngle: body.demoAngle ?? "",
        pricingRange: body.pricingRange ?? "",
        implementationComplexity: body.implementationComplexity ?? "medium",
        status: body.status ?? "building",
      },
    });
    return NextResponse.json(product, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
