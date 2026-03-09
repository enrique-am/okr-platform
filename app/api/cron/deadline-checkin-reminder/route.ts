import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendUrgentCheckinReminder } from "@/lib/email"
import { calcKRProgress, avgProgress } from "@/lib/progress"
import { UserStatus, ObjectiveStatus, Role } from "@prisma/client"
import { toCST, getWeekStartCST, getWeekStartUTC } from "@/lib/checkin-deadline"

// Railway schedule: 0 0 * * 3 (Wed 00:00 UTC = Tue 6pm CST)
// Adjust if secondReminderHour differs from 18 in settings.

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization")
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const settings = await prisma.notificationSettings.findUnique({ where: { id: 1 } })
    if (settings && !settings.secondReminderEnabled) {
      return NextResponse.json({ ok: true, skipped: true, reason: "second_reminder_disabled" })
    }

    const deadlineDay = settings?.deadlineDay ?? 2
    const deadlineHour = settings?.deadlineHour ?? 20

    const utcNow = new Date()
    const weekStartUTC = getWeekStartUTC(toCST(utcNow))

    // Find teams with active objectives whose members haven't submitted this week
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
        userTeams: {
          where: {
            user: {
              status: UserStatus.ACTIVE,
              role: { in: [Role.LEAD, Role.MEMBER] },
              checkIns: { none: { createdAt: { gte: weekStartUTC } } },
            },
          },
          select: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    })

    let sent = 0
    let failed = 0

    for (const team of teams) {
      if (team.userTeams.length === 0) continue

      const orcs = team.objectives.map((obj, idx) => {
        const progresses = obj.keyResults.map((kr) =>
          calcKRProgress(kr.type, kr.currentValue, kr.targetValue)
        )
        return {
          title: obj.title,
          number: idx + 1,
          progress: avgProgress(progresses),
        }
      })

      for (const { user } of team.userTeams) {
        try {
          await sendUrgentCheckinReminder(user.email, {
            name: user.name,
            teamName: team.name,
            teamSlug: team.slug,
            deadlineHour,
            orcs,
          })
          sent++
        } catch (err) {
          console.error(`[deadline-checkin-reminder] Error sending to ${user.email}:`, err)
          failed++
        }
      }
    }

    return NextResponse.json({ ok: true, sent, failed, deadlineDay, deadlineHour })
  } catch (err) {
    console.error("[deadline-checkin-reminder] Fatal error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
