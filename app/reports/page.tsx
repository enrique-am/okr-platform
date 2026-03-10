import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { AppLayout } from "@/components/layout/app-layout"
import { prisma } from "@/lib/prisma"
import {
  getQuarterDateRange,
  getExpectedProgress,
  getTeamProgressSummary,
  type TeamProgressSummary,
} from "@/lib/reports"
import { ReportsClient } from "./reports-client"

export default async function ReportsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login")

  const role = session.user.role
  if (role === "MEMBER") redirect("/dashboard")

  const today = new Date()
  const { start: quarterStart, end: quarterEnd, label: quarterLabel } =
    getQuarterDateRange(today)
  const expectedProgress = getExpectedProgress(quarterStart, quarterEnd, today)

  // LEAD: only their own teams. ADMIN/EXECUTIVE: all teams.
  const isLimited = role === "LEAD"
  const teamIds = session.user.teamIds ?? []
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const rawTeams = await prisma.team.findMany({
    where:
      isLimited && teamIds.length > 0
        ? { id: { in: teamIds } }
        : isLimited
        ? { id: "none" }
        : undefined,
    include: {
      objectives: {
        where: { status: "ACTIVE" },
        include: {
          keyResults: {
            select: {
              id: true,
              title: true,
              type: true,
              currentValue: true,
              targetValue: true,
              startValue: true,
              unit: true,
              trackingStatus: true,
            },
          },
        },
      },
      checkInCompliances: {
        where: { weekStart: { gte: sevenDaysAgo } },
        orderBy: { weekStart: "desc" },
        take: 1,
        select: { submittedAt: true, submittedOnTime: true },
      },
    },
    orderBy: { name: "asc" },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const teams: TeamProgressSummary[] = rawTeams.map((team) =>
    getTeamProgressSummary(team as any, expectedProgress)
  )

  const companyActual =
    teams.length > 0
      ? Math.round(teams.reduce((sum, t) => sum + t.actualProgress, 0) / teams.length)
      : 0
  const companyExpected = Math.round(expectedProgress)

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Reportes</h1>
        <p className="text-sm text-gray-500 mt-1">
          Exporta tarjetas de progreso optimizadas para compartir en WhatsApp o Slack.
        </p>
      </div>
      <ReportsClient
        teams={teams}
        expectedProgress={expectedProgress}
        companyActual={companyActual}
        companyExpected={companyExpected}
        quarterLabel={quarterLabel}
        todayIso={today.toISOString()}
      />
    </AppLayout>
  )
}
