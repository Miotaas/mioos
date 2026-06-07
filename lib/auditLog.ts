import { prisma } from "@/lib/db";
import type { SystemLogSourceType } from "@/types";

export async function auditLog(
  sourceType: SystemLogSourceType,
  sourceId: string,
  event: string,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.systemExecutionLog.create({
      data: {
        sourceType,
        sourceId,
        event,
        details: details ? JSON.stringify(details) : null,
      },
    });
  } catch {
    // Audit log failures must never break the main execution path
  }
}
