"use server"

import { getServerSession } from "next-auth"
import { revalidatePath } from "next/cache"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ObjectiveStatus, TrackingStatus, KeyResultType } from "@prisma/client"
import { logActivity } from "@/lib/activity-log"
import { canManageCompanyObjective } from "@/lib/permissions"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CompanyKRInput {
  title: string
  type: KeyResultType
  targetValue: number
  unit: string
  description: string
  trackingStatus: TrackingStatus
}

export interface CreateCompanyObjectiveInput {
  title: string
  year: number
  startDate?: string  // ISO date string override (e.g. "2025-04-01"); defaults to Jan 1
  endDate?: string    // ISO date string override (e.g. "2025-09-30"); defaults to Dec 31
  ownerId: string | null
  keyResults: CompanyKRInput[]
}

export type CreateCompanyObjectiveResult =
  | { success: true; objectiveId: string }
  | { success: false; error: string }

// ─── Server action ────────────────────────────────────────────────────────────

export async function createCompanyObjective(
  input: CreateCompanyObjectiveInput
): Promise<CreateCompanyObjectiveResult> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { success: false, error: "No autenticado" }

  // Permission: only ADMIN and EXECUTIVE can create company objectives
  if (!canManageCompanyObjective(session.user)) {
    return { success: false, error: "Sin permiso para crear ORCs Empresariales" }
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
    const objective = await prisma.objective.create({
      data: {
        title: input.title.trim(),
        level: "COMPANY",
        year: input.year,
        status: ObjectiveStatus.ACTIVE,
        trackingStatus: TrackingStatus.ON_TRACK,
        startDate,
        endDate,
        ownerId: input.ownerId || null,
        keyResults: {
          create: input.keyResults.map((kr) => ({
            title: kr.title.trim(),
            type: kr.type,
            targetValue: kr.type === KeyResultType.BOOLEAN ? 1 : kr.targetValue,
            currentValue: 0,
            unit: kr.unit.trim() || null,
            description: kr.description.trim() || null,
            trackingStatus: TrackingStatus.ON_TRACK,
          })),
        },
      },
    })

    await logActivity(session.user.id, "CREATE_COMPANY_OBJECTIVE", {
      objectiveId: objective.id,
      title: input.title.trim(),
      year: input.year,
      ...(session.user.impersonatedBy ? { impersonatedBy: session.user.impersonatedBy } : {}),
    })

    revalidatePath("/dashboard/company")
    return { success: true, objectiveId: objective.id }
  } catch (e) {
    console.error("createCompanyObjective error:", e)
    return { success: false, error: "Error al guardar en la base de datos" }
  }
}
