import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Role, TrackingStatus } from "@prisma/client"
import Link from "next/link"
import { AppLayout } from "@/components/layout/app-layout"
import { CompanySummary } from "@/components/dashboard/company-summary"
import { TeamCard } from "@/components/dashboard/team-card"
import type { TeamData, OKRStatus } from "@/lib/mock-data"
import { canCreateObjective, canEditObjective, canSubmitCheckin } from "@/lib/permissions"

export const metadata = { title: "Dashboard – OKR Platform" }

const STATUS_MAP: Record<TrackingStatus, OKRStatus> = {
  ON_TRACK: "on_track",
  AT_RISK: "at_risk",
  OFF_TRACK: "off_track",
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const rawTeams = await prisma.team.findMany({
    include: {
      members: {
        where: { role: Role.LEAD },
        take: 1,
        select: { name: true },
      },
      objectives: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        include: {
          keyResults: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              title: true,
              type: true,
              currentValue: true,
              targetValue: true,
              unit: true,
              trackingStatus: true,
              description: true,
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  })

  const teams: TeamData[] = rawTeams
    .filter((t) => t.objectives.length > 0)
    .map((team) => ({
      id: team.id,
      slug: team.slug,
      name: team.name,
      lead: team.members[0]?.name ?? "Sin líder asignado",
      objectives: team.objectives.map((obj, objIdx) => {
        const krs = obj.keyResults.map((kr, krIdx) => ({
          id: kr.id,
          number: krIdx + 1,
          title: kr.title,
          type: kr.type,
          currentValue: kr.currentValue,
          targetValue: kr.targetValue,
          unit: kr.unit,
          trackingStatus: kr.trackingStatus,
          description: kr.description,
          progress:
            kr.targetValue > 0
              ? Math.min(100, Math.round((kr.currentValue / kr.targetValue) * 100))
              : 0,
        }))
        const progress =
          krs.length > 0
            ? Math.round(krs.reduce((sum, kr) => sum + kr.progress, 0) / krs.length)
            : 0
        return {
          id: obj.id,
          number: objIdx + 1,
          title: obj.title,
          progress,
          status: STATUS_MAP[obj.trackingStatus],
          keyResults: krs,
        }
      }),
    }))

  const userCtx = {
    id: session.user.id,
    role: session.user.role,
    teamId: session.user.teamId,
  }

  return (
    <AppLayout>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Progreso de ORCs por equipo · Q1 2026
          </p>
        </div>
        {canCreateObjective(userCtx) && (
          <Link
            href="/dashboard/new"
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors"
          >
            <span className="text-base leading-none">+</span> Nuevo objetivo
          </Link>
        )}
      </div>

      <div className="mb-8">
        <CompanySummary teams={teams} />
      </div>

      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
          Equipos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              canEdit={canEditObjective(userCtx, team.id)}
              canCheckin={canSubmitCheckin(userCtx, team.id)}
            />
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
