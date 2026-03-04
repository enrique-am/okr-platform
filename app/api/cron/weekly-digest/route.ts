import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendWeeklyDigest } from "@/lib/email"
import { calcKRProgress, avgProgress } from "@/lib/progress"
import { ObjectiveStatus, UserStatus, Role } from "@prisma/client"

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization")
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  // Check notification settings
  const settings = await prisma.notificationSettings.findFirst()
  if (settings && !settings.weeklyDigestEnabled) {
    return NextResponse.json({ ok: true, skipped: true, reason: "digest_disabled" })
  }
  const customMessage = settings?.customDigestMessage ?? null

  // Load all teams with ACTIVE objectives and their KRs
  const teams = await prisma.team.findMany({
    where: {
      objectives: { some: { status: ObjectiveStatus.ACTIVE } },
    },
    include: {
      objectives: {
        where: { status: ObjectiveStatus.ACTIVE },
        orderBy: { createdAt: "asc" },
        include: { keyResults: true },
      },
    },
    orderBy: { name: "asc" },
  })

  // Compute per-team progress
  const teamSummaries = teams
    .map((team) => {
      const allProgresses = team.objectives.flatMap((obj) =>
        obj.keyResults.map((kr) =>
          calcKRProgress(kr.type, kr.currentValue, kr.targetValue, kr.startValue)
        )
      )
      const progress = avgProgress(allProgresses)
      return {
        name: team.name,
        slug: team.slug,
        progress,
        objectiveCount: team.objectives.length,
      }
    })
    .sort((a, b) => b.progress - a.progress)

  const topTeam = teamSummaries[0] ?? null

  // Collect AT_RISK and OFF_TRACK ORCs across all teams
  const atRiskOrcs = teams.flatMap((team) =>
    team.objectives
      .filter((obj) =>
        obj.trackingStatus === "AT_RISK" || obj.trackingStatus === "OFF_TRACK"
      )
      .map((obj) => {
        const progresses = obj.keyResults.map((kr) =>
          calcKRProgress(kr.type, kr.currentValue, kr.targetValue, kr.startValue)
        )
        return {
          title: obj.title,
          teamName: team.name,
          progress: avgProgress(progresses),
          trackingStatus: obj.trackingStatus,
        }
      })
  )

  // Find all ACTIVE EXECUTIVE and ADMIN users
  const recipients = await prisma.user.findMany({
    where: {
      status: UserStatus.ACTIVE,
      role: { in: [Role.EXECUTIVE, Role.ADMIN] },
    },
    select: { id: true, name: true, email: true },
  })

  let sent = 0
  let failed = 0

  for (const user of recipients) {
    try {
      await sendWeeklyDigest(user.email, {
        name: user.name,
        teams: teamSummaries,
        atRiskOrcs,
        topTeam,
        customMessage,
      })
      sent++
    } catch (err) {
      console.error(`[weekly-digest] Error sending to ${user.email}:`, err)
      failed++
    }
  }

  return NextResponse.json({ ok: true, sent, failed, teams: teamSummaries.length })
}
