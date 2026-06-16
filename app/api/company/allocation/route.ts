import { NextResponse } from "next/server";
import { getAllocationPlan, runCapitalAllocation } from "@/lib/company/capital-allocator";

export async function GET() {
  const plan = await getAllocationPlan();
  if (!plan) {
    return NextResponse.json({ plan: [], message: "No allocation plan yet — worker will generate one on next tick" });
  }
  return NextResponse.json({ plan });
}

export async function POST() {
  const { allocationPlan } = await runCapitalAllocation();
  return NextResponse.json({ plan: allocationPlan, updatedAt: new Date().toISOString() });
}
