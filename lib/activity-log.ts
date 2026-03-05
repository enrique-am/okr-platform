import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export async function logActivity(
  userId: string,
  action: string,
  metadata: Prisma.InputJsonValue = {}
) {
  try {
    await prisma.activityLog.create({
      data: { userId, action, metadata },
    })
  } catch (err) {
    // Non-fatal: log the failure but never crash the calling operation
    console.error("[activity-log] Failed to write activity log", {
      userId,
      action,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
