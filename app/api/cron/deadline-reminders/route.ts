import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendDeadlineReminder } from "@/lib/email"
import { calcKRProgress, avgProgress } from "@/lib/progress"
import { ObjectiveStatus, UserStatus, Role } from "@prisma/client"

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization")
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  // Check notification settings
  const settings = await prisma.notificationSettings.findFirst()
  if (settings && !settings.deadlineReminderEnabled) {
    return NextResponse.json({ ok: true, skipped: true, reason: "deadline_reminders_disabled" })
  }
  const reminderDays = settings?.deadlineReminderDays ?? 7
  const customMessage = settings?.customReminderMessage ?? null

  // Date math runs in UTC on the server. Configure Railway to run this job at
  // 14:00 UTC daily, which equals 08:00 CST (UTC-6) or 09:00 CDT (UTC-5) in
  // Mexico City time, depending on daylight-saving season.
  const now = new Date()

  // Target window: objectives whose endDate is between reminderDays and reminderDays+1 from now.
  // Running this job daily means each objective gets exactly one reminder.
  const windowStart = new Date(now.getTime() + reminderDays * 24 * 60 * 60 * 1000)
  const windowEnd   = new Date(now.getTime() + (reminderDays + 1) * 24 * 60 * 60 * 1000)

  // Fetch teams that have objectives ending in the target window.
  // We load ALL active objectives for the team (ordered) so we can derive
  // the correct ORC number for each one.
  const teams = await prisma.team.findMany({
    where: {
      objectives: {
        some: {
          status: ObjectiveStatus.ACTIVE,
          endDate: { gte: windowStart, lt: windowEnd },
        },
      },
    },
    include: {
      // All active objectives (ordered) to compute ORC numbers
      objectives: {
        where: { status: ObjectiveStatus.ACTIVE },
        orderBy: { createdAt: "asc" },
        include: { keyResults: true },
      },
      // Only LEAD + MEMBER active users receive the reminder
      userTeams: {
        where: {
          user: {
            status: UserStatus.ACTIVE,
            role: { in: [Role.LEAD, Role.MEMBER] },
          },
        },
        select: { user: { select: { name: true, email: true } } },
      },
    },
  })

  let sent = 0
  let failed = 0

  for (const team of teams) {
    // Find only the objectives that fall in the 7-day window
    const endingObjectives = team.objectives.filter(
      (obj) => obj.endDate >= windowStart && obj.endDate < windowEnd
    )

    for (const obj of endingObjectives) {
      const orcNumber = team.objectives.indexOf(obj) + 1

      const progresses = obj.keyResults.map((kr) =>
        calcKRProgress(kr.type, kr.currentValue, kr.targetValue)
      )
      const progress = avgProgress(progresses)

      const daysLeft = Math.ceil(
        (obj.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )

      for (const { user: member } of team.userTeams) {
        try {
          await sendDeadlineReminder(member.email, {
            name: member.name,
            orcTitle: obj.title,
            orcNumber,
            progress,
            teamName: team.name,
            teamSlug: team.slug,
            daysLeft,
            customMessage,
          })
          sent++
        } catch (err) {
          console.error(`[deadline-reminders] Error sending to ${member.email}:`, err)
          failed++
        }
      }
    }
  }

  return NextResponse.json({ ok: true, sent, failed })
}
