import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"
import Link from "next/link"
import { AppLayout } from "@/components/layout/app-layout"
import { CompanySummary } from "@/components/dashboard/company-summary"
import { TeamCard } from "@/components/dashboard/team-card"
import type { TeamData } from "@/lib/mock-data"
import { canCreateObjective, canEditObjective, canSubmitCheckin } from "@/lib/permissions"
import { calcKRProgress, progressToOKRStatus } from "@/lib/progress"

export const metadata = { title: "Dashboard – OKR Platform" }

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
        where: { status: "ACTIVE", level: "TEAM" },
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
        const krs = obj.keyResults.map((kr, krIdx) => {
          const progress = calcKRProgress(kr.type, kr.currentValue, kr.targetValue)
          return {
            id: kr.id,
            number: krIdx + 1,
            title: kr.title,
            type: kr.type,
            currentValue: kr.currentValue,
            targetValue: kr.targetValue,
            unit: kr.unit,
            trackingStatus: kr.trackingStatus,
            description: kr.description,
            progress,
          }
        })
        const progress =
          krs.length > 0
            ? Math.round(krs.reduce((sum, kr) => sum + kr.progress, 0) / krs.length)
            : 0
        return {
          id: obj.id,
          number: objIdx + 1,
          title: obj.title,
          progress,
          // Derive status from progress using the new thresholds
          status: progressToOKRStatus(progress),
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
            <span className="text-base leading-none">+</span> Nuevo ORC
          </Link>
        )}
      </div>

      <div className="mb-8">
        <CompanySummary teams={teams} />
      </div>

      {/* Link to company ORCs */}
      <div className="mb-6">
        <Link
          href="/dashboard/company"
          className="inline-flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M4 16.5v-13h-.25a.75.75 0 010-1.5h12.5a.75.75 0 010 1.5H16v13h.25a.75.75 0 010 1.5h-3.5a.75.75 0 01-.75-.75v-2.5a.75.75 0 00-.75-.75h-2.5a.75.75 0 00-.75.75v2.5a.75.75 0 01-.75.75h-3.5a.75.75 0 010-1.5H4zm3-11a.5.5 0 01.5-.5h1a.5.5 0 01.5.5v1a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5v-1zm.5 3.5a.5.5 0 00-.5.5v1a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-1a.5.5 0 00-.5-.5h-1zm2.5-4a.5.5 0 01.5-.5h1a.5.5 0 01.5.5v1a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5v-1zm.5 3.5a.5.5 0 00-.5.5v1a.5.5 0 00.5.5h1a.5.5 0 00.5-.5v-1a.5.5 0 00-.5-.5h-1z" clipRule="evenodd" />
          </svg>
          Ver ORCs Empresariales
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform">
            <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
          </svg>
        </Link>
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
