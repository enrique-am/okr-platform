import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export async function logActivity(
  userId: string,
  action: string,
  metadata: Prisma.InputJsonValue = {}
) {
  await prisma.activityLog.create({
    data: { userId, action, metadata },
  })
}
