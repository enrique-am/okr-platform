"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"

async function assertAdmin() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== "ADMIN") throw new Error("No autorizado")
}

export async function updateUserRole(
  userId: string,
  role: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await assertAdmin()
    await prisma.user.update({
      where: { id: userId },
      data: { role: role as Role },
    })
    revalidatePath("/admin/users")
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error desconocido" }
  }
}

export async function updateUserTeam(
  userId: string,
  teamId: string | null
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await assertAdmin()
    await prisma.user.update({
      where: { id: userId },
      data: { teamId: teamId || null },
    })
    revalidatePath("/admin/users")
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error desconocido" }
  }
}
