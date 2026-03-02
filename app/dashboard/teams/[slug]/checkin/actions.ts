"use server"

import { getServerSession } from "next-auth"
import { revalidatePath } from "next/cache"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logActivity } from "@/lib/activity-log"
import { KeyResultType } from "@prisma/client"
import { canSubmitCheckin } from "@/lib/permissions"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CheckInEntry {
  krId: string
  newValue: number
  originalValue: number
  notes: string
}

export interface SubmitCheckInInput {
  teamSlug: string
  entries: CheckInEntry[]
}

export interface Milestone {
  level: "rc" | "orc" | "team" | "company"
  title: string
}

export type SubmitCheckInResult =
  | { success: true; milestones: Milestone[] }
  | { success: false; error: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcProgress(type: KeyResultType, current: number, target: number): number {
  if (type === KeyResultType.BOOLEAN) return current > 0 ? 100 : 0
  return target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
}

function avgProgress(krs: { type: KeyResultType; currentValue: number; targetValue: number }[]): number {
  if (krs.length === 0) return 0
  return Math.round(krs.reduce((s, kr) => s + calcProgress(kr.type, kr.currentValue, kr.targetValue), 0) / krs.length)
}

// Apply updated values to a KR list (leave others unchanged)
function applyUpdates(
  krs: { id: string; type: KeyResultType; currentValue: number; targetValue: number }[],
  updateMap: Map<string, number>
) {
  return krs.map((kr) => ({
    ...kr,
    currentValue: updateMap.has(kr.id) ? updateMap.get(kr.id)! : kr.currentValue,
  }))
}

// ─── Server action ────────────────────────────────────────────────────────────

export async function submitCheckIn(input: SubmitCheckInInput): Promise<SubmitCheckInResult> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { success: false, error: "No autenticado" }

  // ─── Permission check ─────────────────────────────────────────────────────
  const [teamForPermission, dbUser] = await Promise.all([
    prisma.team.findUnique({ where: { slug: input.teamSlug }, select: { id: true } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { teamId: true } }),
  ])
  if (!canSubmitCheckin({ ...session.user, teamId: dbUser?.teamId }, teamForPermission?.id)) {
    return { success: false, error: "Sin permiso para registrar avances en este equipo" }
  }

  const toProcess = input.entries.filter(
    (e) => e.newValue !== e.originalValue || e.notes.trim() !== ""
  )

  if (toProcess.length === 0) return { success: true, milestones: [] }

  // Build value maps for milestone detection
  const newValueMap = new Map(toProcess.map((e) => [e.krId, e.newValue]))
  const oldValueMap = new Map(toProcess.map((e) => [e.krId, e.originalValue]))

  try {
    // ── Load data for milestone detection ──────────────────────────────────────
    const [updatedKRDetails, teamData, allActiveObjectives] = await Promise.all([
      prisma.keyResult.findMany({
        where: { id: { in: toProcess.map((e) => e.krId) } },
        select: {
          id: true,
          title: true,
          type: true,
          targetValue: true,
          objectiveId: true,
          objective: { select: { id: true, title: true } },
        },
      }),
      prisma.team.findUnique({
        where: { slug: input.teamSlug },
        select: {
          name: true,
          objectives: {
            where: { status: "ACTIVE" },
            select: {
              id: true,
              title: true,
              keyResults: {
                select: { id: true, type: true, currentValue: true, targetValue: true },
              },
            },
          },
        },
      }),
      prisma.objective.findMany({
        where: { status: "ACTIVE" },
        select: {
          keyResults: {
            select: { id: true, type: true, currentValue: true, targetValue: true },
          },
        },
      }),
    ])

    // ── Persist the check-ins ─────────────────────────────────────────────────
    await prisma.$transaction([
      ...toProcess.map((e) =>
        prisma.checkIn.create({
          data: {
            value: e.newValue,
            note: e.notes.trim() || null,
            keyResultId: e.krId,
            authorId: session.user.id,
          },
        })
      ),
      ...toProcess.map((e) =>
        prisma.keyResult.update({
          where: { id: e.krId },
          data: { currentValue: e.newValue },
        })
      ),
    ])

    await logActivity(session.user.id, "SUBMIT_CHECKIN", {
      teamSlug: input.teamSlug,
      entriesCount: toProcess.length,
      ...(session.user.impersonatedBy
        ? { impersonatedBy: session.user.impersonatedBy }
        : {}),
    })

    revalidatePath("/dashboard")
    revalidatePath(`/dashboard/teams/${input.teamSlug}`)

    // ── Milestone detection ───────────────────────────────────────────────────
    const milestones: Milestone[] = []

    // RC level
    for (const kr of updatedKRDetails) {
      const prev = calcProgress(kr.type, oldValueMap.get(kr.id) ?? 0, kr.targetValue)
      const next = calcProgress(kr.type, newValueMap.get(kr.id) ?? 0, kr.targetValue)
      if (prev < 70 && next >= 70) {
        milestones.push({ level: "rc", title: kr.title })
      }
    }

    // ORC level — check each unique parent objective
    const seenObjectiveIds = new Set<string>()
    for (const kr of updatedKRDetails) {
      if (seenObjectiveIds.has(kr.objectiveId)) continue
      seenObjectiveIds.add(kr.objectiveId)

      const obj = teamData?.objectives.find((o) => o.id === kr.objectiveId)
      if (!obj) continue

      const before = avgProgress(applyUpdates(obj.keyResults, oldValueMap))
      const after = avgProgress(applyUpdates(obj.keyResults, newValueMap))
      if (before < 70 && after >= 70) {
        milestones.push({ level: "orc", title: obj.title })
      }
    }

    // Team level
    if (teamData) {
      const allTeamKRs = teamData.objectives.flatMap((o) => o.keyResults)
      const before = avgProgress(applyUpdates(allTeamKRs, oldValueMap))
      const after = avgProgress(applyUpdates(allTeamKRs, newValueMap))
      if (before < 70 && after >= 70) {
        milestones.push({ level: "team", title: teamData.name })
      }
    }

    // Company level
    const allCompanyKRs = allActiveObjectives.flatMap((o) => o.keyResults)
    if (allCompanyKRs.length > 0) {
      const before = avgProgress(applyUpdates(allCompanyKRs, oldValueMap))
      const after = avgProgress(applyUpdates(allCompanyKRs, newValueMap))
      if (before < 70 && after >= 70) {
        milestones.push({ level: "company", title: "Grupo AM" })
      }
    }

    return { success: true, milestones }
  } catch (e) {
    console.error("submitCheckIn error:", e)
    return { success: false, error: "Error al guardar el avance" }
  }
}
