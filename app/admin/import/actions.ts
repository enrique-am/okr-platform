"use server"

import { getServerSession } from "next-auth"
import { revalidatePath } from "next/cache"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ObjectiveStatus, TrackingStatus, KeyResultType } from "@prisma/client"
import { logActivity } from "@/lib/activity-log"
import { captureEvent } from "@/lib/posthog"
import * as Sentry from "@sentry/nextjs"

// ─── Quarter → date range ─────────────────────────────────────────────────────

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

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ImportKR {
  title: string
  type: "PERCENTAGE" | "NUMBER" | "CURRENCY" | "BOOLEAN"
  startValue: number | null
  targetValue: number
  currentValue: number | null
  unit: string | null
}

export interface ImportObjective {
  title: string
  responsible: string | null
  krs: ImportKR[]
}

export interface ImportInput {
  teamId: string
  year: number
  quarter: 1 | 2 | 3 | 4
  replaceExisting: boolean
  objectives: ImportObjective[]
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function checkExistingObjectives(
  teamId: string,
  year: number
): Promise<{ count: number }> {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== "ADMIN") return { count: 0 }

  const count = await prisma.objective.count({
    where: { teamId, year, level: "TEAM", status: "ACTIVE" },
  })
  return { count }
}

export async function importCSV(
  input: ImportInput
): Promise<
  | { success: true; objectivesCreated: number; krsCreated: number }
  | { success: false; error: string }
> {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return { success: false, error: "No autorizado" }
  }

  const adminId = session.user.id
  const { startDate, endDate } = quarterDates(input.quarter, input.year)

  try {
    // Load team members for owner name matching
    const teamMemberLinks = await prisma.userTeam.findMany({
      where: { teamId: input.teamId },
      select: { user: { select: { id: true, name: true } } },
    })
    const teamMembers = teamMemberLinks.map((ut) => ut.user)

    function findOwnerId(name: string | null): string {
      if (!name) return adminId
      const lower = name.toLowerCase()
      return (
        teamMembers.find((m) => m.name?.toLowerCase() === lower)?.id ?? adminId
      )
    }

    await prisma.$transaction(async (tx) => {
      // Replace mode: delete existing active TEAM objectives for this team+year
      // Cascade deletes KRs → CheckIns + DataSources automatically
      if (input.replaceExisting) {
        await tx.objective.deleteMany({
          where: {
            teamId: input.teamId,
            year: input.year,
            level: "TEAM",
            status: "ACTIVE",
          },
        })
      }

      for (const obj of input.objectives) {
        await tx.objective.create({
          data: {
            title: obj.title,
            level: "TEAM",
            status: ObjectiveStatus.ACTIVE,
            trackingStatus: TrackingStatus.ON_TRACK,
            startDate,
            endDate,
            year: input.year,
            teamId: input.teamId,
            ownerId: findOwnerId(obj.responsible),
            keyResults: {
              create: obj.krs.map((kr) => ({
                title: kr.title,
                type: kr.type as KeyResultType,
                targetValue:
                  kr.type === "BOOLEAN" ? 1 : Math.max(0, kr.targetValue),
                startValue: kr.type === "BOOLEAN" ? null : (kr.startValue ?? null),
                currentValue:
                  kr.type === "BOOLEAN"
                    ? 0
                    : (kr.currentValue ?? kr.startValue ?? 0),
                unit: kr.unit ?? null,
                trackingStatus: TrackingStatus.ON_TRACK,
              })),
            },
          },
        })
      }
    })

    const objectivesCreated = input.objectives.length
    const krsCreated = input.objectives.reduce((s, o) => s + o.krs.length, 0)

    await logActivity(adminId, "CSV_IMPORT", {
      teamId: input.teamId,
      year: input.year,
      quarter: `Q${input.quarter}`,
      objectivesCreated,
      krsCreated,
      replaceExisting: input.replaceExisting,
    })

    captureEvent(adminId, "csv_imported", {
      teamId: input.teamId,
      orcCount: objectivesCreated,
      rcCount: krsCreated,
    })

    revalidatePath("/dashboard")
    revalidatePath("/admin/import")

    return { success: true, objectivesCreated, krsCreated }
  } catch (e) {
    Sentry.captureException(e, { data: { action: "importCSV", userId: adminId, teamId: input.teamId } })
    console.error("importCSV error:", e)
    return {
      success: false,
      error: e instanceof Error ? e.message : "Error desconocido",
    }
  }
}
