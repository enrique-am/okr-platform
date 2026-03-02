import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Role, TrackingStatus } from "@prisma/client"
import Link from "next/link"
import { NavBar } from "@/components/dashboard/nav-bar"
import { CompanySummary } from "@/components/dashboard/company-summary"
import { TeamCard } from "@/components/dashboard/team-card"
import type { TeamData, OKRStatus } from "@/lib/mock-data"

export const metadata = { title: "Dashboard – OKR Platform" }

// Prisma TrackingStatus → component OKRStatus
const STATUS_MAP: Record<TrackingStatus, OKRStatus> = {
  ON_TRACK: "on_track",
  AT_RISK: "at_risk",
  OFF_TRACK: "off_track",
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  // ── Fetch teams with their active objectives and key results ──────────────
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
            select: {
              id: true,
              title: true,
              currentValue: true,
              targetValue: true,
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  })

  // ── Map to the shape the existing components expect ───────────────────────
  const teams: TeamData[] = rawTeams
    .filter((t) => t.objectives.length > 0)
    .map((team) => ({
      id: team.id,
      name: team.name,
      lead: team.members[0]?.name ?? "Sin líder asignado",
      objectives: team.objectives.map((obj) => {
        const krs = obj.keyResults.map((kr) => ({
          id: kr.id,
          title: kr.title,
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
          title: obj.title,
          progress,
          status: STATUS_MAP[obj.trackingStatus],
          keyResults: krs,
        }
      }),
    }))

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar user={session.user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Progreso de OKRs por equipo · Q1 2026
            </p>
          </div>
          <Link
            href="/dashboard/new"
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors"
          >
            <span className="text-base leading-none">+</span> Nuevo objetivo
          </Link>
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
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
