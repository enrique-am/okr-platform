"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function markFeedbackRead(id: string): Promise<{ success: true } | { success: false; error: string }> {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== "ADMIN") return { success: false, error: "No autorizado" }

  try {
    await prisma.feedbackReport.update({
      where: { id },
      data: { read: true },
    })
    revalidatePath("/admin/feedback")
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error desconocido" }
  }
}
