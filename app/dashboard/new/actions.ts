"use server"

import { getServerSession } from "next-auth"
import { revalidatePath } from "next/cache"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ObjectiveStatus, TrackingStatus, KeyResultType } from "@prisma/client"
import { logActivity } from "@/lib/activity-log"
import { captureEvent } from "@/lib/posthog"
import * as Sentry from "@sentry/nextjs"
import { canCreateObjective } from "@/lib/permissions"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DataSourceInput {
  name: string
  url: string | null
  instructions: string | null
}

export interface KRInput {
  title: string
  type: KeyResultType
  targetValue: number
  startValue: number | null
  unit: string
  description: string
  trackingStatus: TrackingStatus
  dataSource: DataSourceInput | null
}

export interface CreateObjectiveInput {
  title: string
  teamId: string
  quarter: 1 | 2 | 3 | 4
  year: number
  keyResults: KRInput[]
}

export type CreateObjectiveResult =
  | { success: true; objectiveId: string }
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

function deriveObjectiveStatus(krs: KRInput[]): TrackingStatus {
  if (krs.some((kr) => kr.trackingStatus === TrackingStatus.OFF_TRACK)) return TrackingStatus.OFF_TRACK
  if (krs.some((kr) => kr.trackingStatus === TrackingStatus.AT_RISK)) return TrackingStatus.AT_RISK
  return TrackingStatus.ON_TRACK
}

// ─── Server action ────────────────────────────────────────────────────────────

export async function createObjective(
  input: CreateObjectiveInput
): Promise<CreateObjectiveResult> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { success: false, error: "No autenticado" }

  // ─── Permission check ─────────────────────────────────────────────────────
  if (!canCreateObjective(session.user)) {
    return { success: false, error: "Sin permiso para crear objetivos" }
  }
  // LEAD can only create objectives for their own teams
  if (session.user.role === "LEAD") {
    const isMember = await prisma.userTeam.findUnique({
      where: { userId_teamId: { userId: session.user.id, teamId: input.teamId } },
    })
    if (!isMember) {
      return { success: false, error: "Solo puedes crear ORCs para tu propio equipo" }
    }
  }

  // Basic validation
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
  const objectiveTrackingStatus = deriveObjectiveStatus(input.keyResults)

  try {
    const objective = await prisma.objective.create({
      data: {
        title: input.title.trim(),
        level: "TEAM",
        status: ObjectiveStatus.ACTIVE,
        trackingStatus: objectiveTrackingStatus,
        startDate,
        endDate,
        ownerId: session.user.id,
        teamId: input.teamId,
        keyResults: {
          create: input.keyResults.map((kr) => {
            const ds = kr.dataSource
            const hasDS = ds && ds.name.trim()
            return {
              title: kr.title.trim(),
              type: kr.type,
              targetValue: kr.type === KeyResultType.BOOLEAN ? 1 : kr.targetValue,
              startValue: kr.type === KeyResultType.BOOLEAN ? null : (kr.startValue ?? null),
              currentValue: 0,
              unit: kr.unit.trim() || null,
              description: kr.description.trim() || null,
              trackingStatus: kr.trackingStatus,
              ...(hasDS ? {
                dataSource: {
                  create: {
                    name: ds!.name.trim(),
                    url: ds!.url?.trim() || null,
                    instructions: ds!.instructions?.trim() || null,
                  },
                },
              } : {}),
            }
          }),
        },
      },
    })

    await logActivity(session.user.id, "CREATE_OBJECTIVE", {
      objectiveId: objective.id,
      title: input.title.trim(),
      teamId: input.teamId,
      ...(session.user.impersonatedBy
        ? { impersonatedBy: session.user.impersonatedBy }
        : {}),
    })

    captureEvent(session.user.id, "orc_created", {
      teamId: input.teamId,
      level: "TEAM",
      krsCount: input.keyResults.length,
    })

    revalidatePath("/dashboard")
    return { success: true, objectiveId: objective.id }
  } catch (e) {
    Sentry.captureException(e, { data: { action: "createObjective", userId: session.user.id, teamId: input.teamId } })
    console.error("createObjective error:", e)
    return { success: false, error: "Error al guardar en la base de datos" }
  }
}
