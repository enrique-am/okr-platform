"use server"

import { getServerSession } from "next-auth"
import { revalidatePath } from "next/cache"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("No autorizado")
  }
  return session.user
}

export async function createSection(data: {
  title: string
  slug: string
  content: string
  isPublished: boolean
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAdmin()
    const maxOrder = await prisma.helpSection.aggregate({ _max: { order: true } })
    const order = (maxOrder._max.order ?? 0) + 1
    await prisma.helpSection.create({
      data: { ...data, order, updatedById: user.id },
    })
    revalidatePath("/admin/ayuda")
    revalidatePath("/ayuda")
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error desconocido" }
  }
}

export async function updateSection(
  id: string,
  data: { title: string; slug: string; content: string; isPublished: boolean }
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAdmin()
    await prisma.helpSection.update({
      where: { id },
      data: { ...data, updatedById: user.id },
    })
    revalidatePath("/admin/ayuda")
    revalidatePath("/ayuda")
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error desconocido" }
  }
}

export async function deleteSection(id: string): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requireAdmin()
    await prisma.helpSection.delete({ where: { id } })
    revalidatePath("/admin/ayuda")
    revalidatePath("/ayuda")
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error desconocido" }
  }
}

export async function togglePublish(id: string, isPublished: boolean): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAdmin()
    await prisma.helpSection.update({
      where: { id },
      data: { isPublished, updatedById: user.id },
    })
    revalidatePath("/admin/ayuda")
    revalidatePath("/ayuda")
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error desconocido" }
  }
}

export async function reorderSections(ids: string[]): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requireAdmin()
    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.helpSection.update({ where: { id }, data: { order: index + 1 } })
      )
    )
    revalidatePath("/admin/ayuda")
    revalidatePath("/ayuda")
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error desconocido" }
  }
}

export async function uploadDocument(sectionId: string, formData: FormData): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requireAdmin()
    const file = formData.get("file") as File | null
    const title = formData.get("title") as string | null

    if (!file) return { success: false, error: "No se proporcionó archivo" }

    const arrayBuffer = await file.arrayBuffer()
    const fileData = Buffer.from(arrayBuffer)

    const maxOrder = await prisma.helpDocument.aggregate({
      where: { sectionId },
      _max: { order: true },
    })
    const order = (maxOrder._max.order ?? 0) + 1

    await prisma.helpDocument.create({
      data: {
        sectionId,
        title: title || file.name,
        filename: file.name,
        mimeType: file.type || "application/pdf",
        fileData,
        fileSize: file.size,
        order,
      },
    })

    revalidatePath("/admin/ayuda")
    revalidatePath("/ayuda")
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error desconocido" }
  }
}

export async function deleteDocument(id: string): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requireAdmin()
    await prisma.helpDocument.delete({ where: { id } })
    revalidatePath("/admin/ayuda")
    revalidatePath("/ayuda")
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error desconocido" }
  }
}
