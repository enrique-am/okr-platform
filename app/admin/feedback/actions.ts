"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function markFeedbackRead(id: string) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== "ADMIN") throw new Error("No autorizado")

  await prisma.feedbackReport.update({
    where: { id },
    data: { read: true },
  })
  revalidatePath("/admin/feedback")
}
