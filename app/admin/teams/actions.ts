"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

async function assertAdmin() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== "ADMIN") throw new Error("No autorizado")
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
}

export async function createTeam(
  name: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await assertAdmin()
    if (!name.trim()) return { success: false, error: "El nombre es requerido" }
    const slug = toSlug(name.trim())
    if (!slug) return { success: false, error: "El nombre debe contener caracteres válidos" }
    await prisma.team.create({ data: { name: name.trim(), slug } })
    revalidatePath("/admin/teams")
    return { success: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido"
    if (msg.includes("Unique constraint")) {
      return { success: false, error: "Ya existe un equipo con ese nombre o slug" }
    }
    return { success: false, error: msg }
  }
}

export async function updateTeamName(
  teamId: string,
  name: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await assertAdmin()
    if (!name.trim()) return { success: false, error: "El nombre es requerido" }
    await prisma.team.update({
      where: { id: teamId },
      data: { name: name.trim() },
    })
    revalidatePath("/admin/teams")
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error desconocido" }
  }
}
