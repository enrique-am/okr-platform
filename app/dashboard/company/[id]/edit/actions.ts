"use server"

import { getServerSession } from "next-auth"
import { revalidatePath } from "next/cache"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ObjectiveStatus, TrackingStatus, KeyResultType } from "@prisma/client"
import { canManageCompanyObjective } from "@/lib/permissions"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DataSourceInput {
  name: string
  url: string | null
  instructions: string | null
}

export interface EditCompanyKRInput {
  id?: string
  title: string
  type: KeyResultType
  targetValue: number
  currentValue: number
  unit: string
  description: string
  trackingStatus: TrackingStatus
  dataSource: DataSourceInput | null
}

export interface UpdateCompanyObjectiveInput {
  objectiveId: string
  title: string
  year: number
  startDate?: string  // ISO date string override; defaults to Jan 1 of year
  endDate?: string    // ISO date string override; defaults to Dec 31 of year
  ownerId: string | null
  objectiveStatus: ObjectiveStatus
  keyResults: EditCompanyKRInput[]
}

export type UpdateCompanyObjectiveResult =
  | { success: true }
  | { success: false; error: string }

// ─── Server action ────────────────────────────────────────────────────────────

export async function updateCompanyObjective(
  input: UpdateCompanyObjectiveInput
): Promise<UpdateCompanyObjectiveResult> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { success: false, error: "No autenticado" }

  // Fetch objective to verify it exists and get current ownerId for permission check
  const objective = await prisma.objective.findUnique({
    where: { id: input.objectiveId },
    select: { level: true, ownerId: true },
  })
  if (!objective || objective.level !== "COMPANY") {
    return { success: false, error: "ORC Empresarial no encontrado" }
  }

  if (!canManageCompanyObjective(session.user, objective.ownerId)) {
    return { success: false, error: "Sin permiso para editar este ORC Empresarial" }
  }

  if (!input.title.trim()) return { success: false, error: "El título es requerido" }
  if (!input.year || input.year < 2020) return { success: false, error: "Año inválido" }
  if (input.keyResults.length === 0) return { success: false, error: "Agrega al menos un resultado clave" }
  if (input.keyResults.some((kr) => !kr.title.trim())) {
    return { success: false, error: "Todos los resultados clave deben tener un título" }
  }
  if (input.keyResults.some((kr) => kr.type !== KeyResultType.BOOLEAN && kr.targetValue <= 0)) {
    return { success: false, error: "El valor objetivo debe ser mayor que 0" }
  }

  const startDate = input.startDate ? new Date(input.startDate) : new Date(input.year, 0, 1)
  const endDate   = input.endDate   ? new Date(input.endDate)   : new Date(input.year, 11, 31)

  try {
    const existing = await prisma.keyResult.findMany({
      where: { objectiveId: input.objectiveId },
      select: { id: true },
    })
    const existingIds = new Set(existing.map((kr) => kr.id))
    const keptIds     = new Set(input.keyResults.filter((kr) => kr.id).map((kr) => kr.id!))
    const idsToDelete = [...existingIds].filter((id) => !keptIds.has(id))

    await prisma.$transaction([
      prisma.objective.update({
        where: { id: input.objectiveId },
        data: {
          title: input.title.trim(),
          year: input.year,
          startDate,
          endDate,
          status: input.objectiveStatus,
          ownerId: input.ownerId || null,
        },
      }),
      // Delete removed KRs (DataSource cascades automatically)
      ...(idsToDelete.length > 0
        ? [prisma.keyResult.deleteMany({ where: { id: { in: idsToDelete } } })]
        : []),
      // Update existing KRs
      ...input.keyResults
        .filter((kr) => kr.id)
        .map((kr) =>
          prisma.keyResult.update({
            where: { id: kr.id },
            data: {
              title: kr.title.trim(),
              type: kr.type,
              targetValue: kr.type === KeyResultType.BOOLEAN ? 1 : kr.targetValue,
              currentValue: kr.currentValue,
              unit: kr.unit.trim() || null,
              description: kr.description.trim() || null,
              trackingStatus: kr.trackingStatus,
            },
          })
        ),
      // Upsert or delete DataSource for existing KRs
      ...input.keyResults
        .filter((kr) => kr.id)
        .map((kr) => {
          const ds = kr.dataSource
          const hasDS = ds && ds.name.trim()
          if (hasDS) {
            return prisma.dataSource.upsert({
              where: { keyResultId: kr.id! },
              create: {
                keyResultId: kr.id!,
                name: ds!.name.trim(),
                url: ds!.url?.trim() || null,
                instructions: ds!.instructions?.trim() || null,
              },
              update: {
                name: ds!.name.trim(),
                url: ds!.url?.trim() || null,
                instructions: ds!.instructions?.trim() || null,
              },
            })
          } else {
            return prisma.dataSource.deleteMany({ where: { keyResultId: kr.id! } })
          }
        }),
      // Create new KRs (with optional DataSource)
      ...input.keyResults
        .filter((kr) => !kr.id)
        .map((kr) => {
          const ds = kr.dataSource
          const hasDS = ds && ds.name.trim()
          return prisma.keyResult.create({
            data: {
              title: kr.title.trim(),
              type: kr.type,
              targetValue: kr.type === KeyResultType.BOOLEAN ? 1 : kr.targetValue,
              currentValue: kr.currentValue,
              unit: kr.unit.trim() || null,
              description: kr.description.trim() || null,
              trackingStatus: kr.trackingStatus,
              objectiveId: input.objectiveId,
              ...(hasDS ? {
                dataSource: {
                  create: {
                    name: ds!.name.trim(),
                    url: ds!.url?.trim() || null,
                    instructions: ds!.instructions?.trim() || null,
                  },
                },
              } : {}),
            },
          })
        }),
    ])

    revalidatePath("/dashboard/company")
    return { success: true }
  } catch (e) {
    console.error("updateCompanyObjective error:", e)
    return { success: false, error: "Error al guardar en la base de datos" }
  }
}
