import { prisma } from "@/lib/prisma"
import { AdminNavClient } from "./admin-nav-client"

export async function AdminNav() {
  const unreadFeedback = await prisma.feedbackReport.count({ where: { read: false } })
  return <AdminNavClient unreadFeedback={unreadFeedback} />
}
