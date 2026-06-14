import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const projects = await prisma.project.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    });

    // Enrich with counts (no @relations on Project, so manual queries)
    const projectIds = projects.map((p) => p.id);

    const [revenueGroups, outputGroups] = await Promise.all([
      prisma.revenueEntry.groupBy({
        by: ["projectId"],
        where: { projectId: { in: projectIds } },
        _count: { id: true },
        _sum: { amount: true },
      }),
      prisma.workforceOutput.groupBy({
        by: ["projectId"],
        where: { projectId: { in: projectIds } },
        _count: { id: true },
      }),
    ]);

    const revenueByProject = Object.fromEntries(
      revenueGroups.map((r) => [r.projectId!, { count: r._count.id, total: r._sum.amount ?? 0 }])
    );
    const outputsByProject = Object.fromEntries(
      outputGroups.map((o) => [o.projectId!, o._count.id])
    );

    const enriched = projects.map((p) => ({
      ...p,
      revenueCount: revenueByProject[p.id]?.count ?? 0,
      revenueTotal: revenueByProject[p.id]?.total ?? 0,
      outputsCount: outputsByProject[p.id] ?? 0,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("[projects GET]", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const project = await prisma.project.create({ data: body });
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("[projects POST]", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
