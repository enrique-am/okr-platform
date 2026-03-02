import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { NavBar } from "@/components/dashboard/nav-bar"
import { CompanySummary } from "@/components/dashboard/company-summary"
import { TeamCard } from "@/components/dashboard/team-card"
import { MOCK_TEAMS } from "@/lib/mock-data"

export const metadata = {
  title: "Dashboard – OKR Platform",
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar user={session.user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Page heading */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Progreso de OKRs por equipo · Q1 2026
          </p>
        </div>

        {/* Company-wide summary */}
        <div className="mb-8">
          <CompanySummary teams={MOCK_TEAMS} />
        </div>

        {/* Team cards */}
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
            Equipos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {MOCK_TEAMS.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        </div>

      </main>
    </div>
  )
}
