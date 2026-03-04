import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendWeeklyCheckinReminder } from "@/lib/email"
import { calcKRProgress, avgProgress } from "@/lib/progress"
import { UserStatus, ObjectiveStatus, Role } from "@prisma/client"

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization")
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  // Date math runs in UTC on the server. Railway should be configured to call
  // this endpoint at 14:00 UTC on Mondays, which equals 08:00 CST (UTC-6) or
  // 09:00 CDT (UTC-5) in Mexico City time, depending on daylight-saving season.
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // Find teams with at least one active objective and load their LEAD/MEMBER members
  // who have not submitted any check-in in the last 7 days.
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
            checkIns: { none: { createdAt: { gte: sevenDaysAgo } } },
          },
        },
        select: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  })

  let sent = 0
  let failed = 0

  for (const team of teams) {
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
  }

  return NextResponse.json({ ok: true, sent, failed })
}
