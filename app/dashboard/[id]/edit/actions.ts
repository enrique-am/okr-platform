"use server"

import { getServerSession } from "next-auth"
import { revalidatePath } from "next/cache"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ObjectiveStatus, TrackingStatus, KeyResultType } from "@prisma/client"
import { canEditObjective } from "@/lib/permissions"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DataSourceInput {
  name: string
  url: string | null
  instructions: string | null
}

export interface EditKRInput {
  id?: string // undefined = new KR
  title: string
  type: KeyResultType
  targetValue: number
  startValue: number | null
  currentValue: number
  unit: string
  description: string
  trackingStatus: TrackingStatus
  dataSource: DataSourceInput | null
}

export interface UpdateObjectiveInput {
  objectiveId: string
  title: string
  teamId: string
  quarter: 1 | 2 | 3 | 4
  year: number
  objectiveStatus: ObjectiveStatus
  keyResults: EditKRInput[]
}

export type UpdateObjectiveResult =
  | { success: true }
  | { success: false; error: string }

// ─── Quarter → dates ──────────────────────────────────────────────────────────

function quarterDates(quarter: 1 | 2 | 3 | 4, year: number) {
  const ranges: Record<number, [string, string]> = {
    1: [`${year}-01-01`, `${year}-03-31`],
    2: [`${year}-04-01`, `${year}-06-30`],
    3: [`${year}-07-01`, `${year}-09-30`],
    4: [`${year}-10-01`, `${year}-12-31`],
  }
  const [start, end] = ranges[quarter]
  return { startDate: new Date(start), endDate: new Date(end) }
}

// ─── Derive objective tracking status from KRs ────────────────────────────────

function deriveTrackingStatus(krs: EditKRInput[]): TrackingStatus {
  if (krs.some((kr) => kr.trackingStatus === TrackingStatus.OFF_TRACK)) return TrackingStatus.OFF_TRACK
  if (krs.some((kr) => kr.trackingStatus === TrackingStatus.AT_RISK)) return TrackingStatus.AT_RISK
  return TrackingStatus.ON_TRACK
}

// ─── Server action ────────────────────────────────────────────────────────────

export async function updateObjective(
  input: UpdateObjectiveInput
): Promise<UpdateObjectiveResult> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { success: false, error: "No autenticado" }

  // ─── Permission check ─────────────────────────────────────────────────────
  // Fetch the objective's team from DB to verify permissions (never trust client input alone)
  const [objective, dbUser] = await Promise.all([
    prisma.objective.findUnique({
      where: { id: input.objectiveId },
      select: { teamId: true, level: true },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    }),
  ])
  if (objective?.level === "COMPANY") {
    return { success: false, error: "Usa la sección Empresa para editar ORCs Empresariales" }
  }
  if (!canEditObjective({ ...session.user, teamId: dbUser?.teamId }, objective?.teamId)) {
    return { success: false, error: "Sin permiso para editar este objetivo" }
  }
  // LEAD cannot reassign an objective to a different team
  if (session.user.role === "LEAD" && input.teamId !== dbUser?.teamId) {
    return { success: false, error: "No puedes reasignar un objetivo a otro equipo" }
  }

  if (!input.title.trim()) return { success: false, error: "El título es requerido" }
  if (!input.teamId) return { success: false, error: "Selecciona un equipo" }
  if (input.keyResults.length === 0) return { success: false, error: "Agrega al menos un resultado clave" }
  if (input.keyResults.some((kr) => !kr.title.trim())) {
    return { success: false, error: "Todos los resultados clave deben tener un título" }
  }
  if (input.keyResults.some((kr) => kr.type !== KeyResultType.BOOLEAN && kr.targetValue <= 0)) {
    return { success: false, error: "El valor objetivo debe ser mayor que 0" }
  }

  const { startDate, endDate } = quarterDates(input.quarter, input.year)
  const trackingStatus = deriveTrackingStatus(input.keyResults)

  try {
    // Determine which existing KRs were removed
    const existing = await prisma.keyResult.findMany({
      where: { objectiveId: input.objectiveId },
      select: { id: true },
    })
    const existingIds = new Set(existing.map((kr) => kr.id))
    const keptIds = new Set(input.keyResults.filter((kr) => kr.id).map((kr) => kr.id!))
    const idsToDelete = [...existingIds].filter((id) => !keptIds.has(id))

    await prisma.$transaction([
      // Update objective
      prisma.objective.update({
        where: { id: input.objectiveId },
        data: {
          title: input.title.trim(),
          teamId: input.teamId,
          startDate,
          endDate,
          status: input.objectiveStatus,
          trackingStatus,
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
              startValue: kr.type === KeyResultType.BOOLEAN ? null : (kr.startValue ?? null),
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
              startValue: kr.type === KeyResultType.BOOLEAN ? null : (kr.startValue ?? null),
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

    revalidatePath("/dashboard")
    return { success: true }
  } catch (e) {
    console.error("updateObjective error:", e)
    return { success: false, error: "Error al guardar en la base de datos" }
  }
}
