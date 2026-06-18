import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { WORKFORCE_AUTONOMY_KEY } from "@/lib/workforce/autonomous-engine";

const VALID_LEVELS = ["off", "conservative", "normal", "aggressive"] as const;
type Level = (typeof VALID_LEVELS)[number];

const DAILY_LIMITS: Record<Level, number> = {
  off:          0,
  conservative: 1,
  normal:       3,
  aggressive:   6,
};

const TEAM_SLUGS = ["ecommerce", "automation-sales", "youtube", "crypto-stock"];

export async function GET() {
  try {
    const cfg   = await prisma.systemConfig.findUnique({ where: { key: WORKFORCE_AUTONOMY_KEY } });
    const level = ((cfg?.value ?? "conservative") as Level);
    const dailyLimit = DAILY_LIMITS[level] ?? 1;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const teams = await prisma.workforceTeam.findMany({
      where:  { slug: { in: TEAM_SLUGS } },
      select: { id: true, name: true, slug: true },
    });

    const teamStats = await Promise.all(
      teams.map(async (team) => {
        const [todayRuns, activeAssignments] = await Promise.all([
          prisma.workforceOutput.count({
            where: { teamId: team.id, createdAt: { gte: todayStart } },
          }),
          prisma.assignment.count({
            where: { teamId: team.id, status: { in: ["pending", "active", "review"] } },
          }),
        ]);
        return {
          slug:             team.slug,
          name:             team.name,
          todayRuns,
          dailyLimit,
          activeAssignments,
          status:
            level === "off"               ? "off"
            : todayRuns >= dailyLimit      ? "at_limit"
            : activeAssignments >= 2       ? "busy"
            : "ready",
        };
      })
    );

    return NextResponse.json({ level, dailyLimit, teams: teamStats });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body  = await req.json() as { level?: string };
    const level = body.level ?? "";
    if (!VALID_LEVELS.includes(level as Level)) {
      return NextResponse.json(
        { error: `Invalid level. Use one of: ${VALID_LEVELS.join(", ")}` },
        { status: 400 }
      );
    }
    await prisma.systemConfig.upsert({
      where:  { key: WORKFORCE_AUTONOMY_KEY },
      update: { value: level },
      create: { key: WORKFORCE_AUTONOMY_KEY, value: level },
    });
    return NextResponse.json({ level, dailyLimit: DAILY_LIMITS[level as Level] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
