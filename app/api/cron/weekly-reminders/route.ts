import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendWeeklyCheckinReminder } from "@/lib/email"
import { calcKRProgress, avgProgress } from "@/lib/progress"
import { UserStatus, ObjectiveStatus } from "@prisma/client"

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization")
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  // Date math runs in UTC on the server. Railway should be configured to call
  // this endpoint at 14:00 UTC on Mondays, which equals 08:00 CST (UTC-6) or
  // 09:00 CDT (UTC-5) in Mexico City time, depending on daylight-saving season.
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // Find ACTIVE users who belong to a team and have not submitted any
  // check-in in the last 7 days, AND whose team has at least one active objective.
  const users = await prisma.user.findMany({
    where: {
      status: UserStatus.ACTIVE,
      teamId: { not: null },
      checkIns: {
        none: {
          createdAt: { gte: sevenDaysAgo },
        },
      },
      team: {
        objectives: {
          some: { status: ObjectiveStatus.ACTIVE },
        },
      },
    },
    include: {
      team: {
        include: {
          objectives: {
            where: { status: ObjectiveStatus.ACTIVE },
            orderBy: { createdAt: "asc" },
            include: { keyResults: true },
          },
        },
      },
    },
  })

  let sent = 0
  let failed = 0

  for (const user of users) {
    const team = user.team!

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

    try {
      await sendWeeklyCheckinReminder(user.email, {
        name: user.name,
        teamName: team.name,
        teamSlug: team.slug,
        orcs,
      })
      sent++
    } catch (err) {
      console.error(`[weekly-reminders] Error sending to ${user.email}:`, err)
      failed++
    }
  }

  return NextResponse.json({ ok: true, sent, failed, total: users.length })
}
