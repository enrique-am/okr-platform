import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendComplianceReport } from "@/lib/email"
import { Role, UserStatus } from "@prisma/client"
import { toCST, getWeekStartCST } from "@/lib/checkin-deadline"

// Railway schedule: 0 15 * * 3 (Wed 15:00 UTC = Wed 9am CST)

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization")
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const settings = await prisma.notificationSettings.findUnique({ where: { id: 1 } })
    if (settings && !settings.complianceReportEnabled) {
      return NextResponse.json({ ok: true, skipped: true, reason: "compliance_report_disabled" })
    }

    const utcNow = new Date()
    const cstNow = toCST(utcNow)
    const weekStartCST = getWeekStartCST(cstNow)

    // Format "Semana del DD/MM/YYYY"
    const dd = String(weekStartCST.getUTCDate()).padStart(2, "0")
    const mm = String(weekStartCST.getUTCMonth() + 1).padStart(2, "0")
    const yyyy = weekStartCST.getUTCFullYear()
    const weekLabel = `Semana del ${dd}/${mm}/${yyyy}`

    // Load all teams with their compliance record for this week
    const teams = await prisma.team.findMany({
      orderBy: { name: "asc" },
      include: {
        checkInCompliances: {
          where: { weekStart: weekStartCST },
          take: 1,
        },
      },
    })

    const teamRows = teams.map((t) => {
      const rec = t.checkInCompliances[0] ?? null
      return {
        name: t.name,
        slug: t.slug,
        submitted: rec !== null,
        submittedOnTime: rec?.submittedOnTime ?? false,
        submittedAt: rec?.submittedAt ?? null,
      }
    })

    const submittedCount = teamRows.filter((t) => t.submitted).length
    const complianceRate = teams.length > 0
      ? Math.round((submittedCount / teams.length) * 100)
      : 0

    // Send to all ADMIN users
    const admins = await prisma.user.findMany({
      where: { role: Role.ADMIN, status: UserStatus.ACTIVE },
      select: { id: true, name: true, email: true },
    })

    let sent = 0
    let failed = 0

    for (const admin of admins) {
      try {
        await sendComplianceReport(admin.email, {
          name: admin.name,
          weekLabel,
          teams: teamRows,
          complianceRate,
        })
        sent++
      } catch (err) {
        console.error(`[compliance-report] Error sending to ${admin.email}:`, err)
        failed++
      }
    }

    return NextResponse.json({ ok: true, sent, failed, complianceRate, weekLabel })
  } catch (err) {
    console.error("[compliance-report] Fatal error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
