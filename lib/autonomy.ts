import { prisma } from "@/lib/db";

const AUTONOMY_KEY = "autonomy_paused";

export async function isAutonomyPaused(): Promise<boolean> {
  try {
    const cfg = await prisma.systemConfig.findUnique({ where: { key: AUTONOMY_KEY } });
    return cfg?.value === "true";
  } catch {
    return false;
  }
}

export async function setAutonomyPaused(paused: boolean): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key: AUTONOMY_KEY },
    update: { value: String(paused) },
    create: { key: AUTONOMY_KEY, value: String(paused) },
  });
}
