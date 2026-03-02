import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { KeyResultType } from "@prisma/client"
import { AppLayout } from "@/components/layout/app-layout"
import { canManageCompanyObjective } from "@/lib/permissions"
import { calcKRProgress, progressToTrafficLight, progressToOKRStatus } from "@/lib/progress"
import { CompanyORCAccordion } from "./company-orc-accordion"

export const metadata = { title: "ORCs Empresariales – OKR Platform" }

// ─── Traffic light config ─────────────────────────────────────────────────────

const TRAFFIC: Record<
  "ON_TRACK" | "AT_RISK" | "OFF_TRACK",
  { label: string; badge: string; dot: string; bar: string }
> = {
  ON_TRACK:  { label: "En seguimiento", badge: "bg-brand-50 text-brand-700",   dot: "bg-brand-500", bar: "bg-brand-500" },
  AT_RISK:   { label: "En riesgo",      badge: "bg-amber-50 text-amber-700",   dot: "bg-amber-400", bar: "bg-amber-400" },
  OFF_TRACK: { label: "Retrasado",      badge: "bg-red-50 text-red-600",       dot: "bg-red-400",   bar: "bg-red-400"   },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CompanyPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const userCtx = {
    id: session.user.id,
    role: session.user.role,
    teamId: session.user.teamId,
  }

  const rawObjectives = await prisma.objective.findMany({
    where: { level: "COMPANY", status: "ACTIVE" },
    orderBy: [{ year: "desc" }, { createdAt: "asc" }],
    include: {
      owner: { select: { id: true, name: true } },
      keyResults: { orderBy: { createdAt: "asc" } },
    },
  })

  // Build enriched objectives with computed progress
  const objectives = rawObjectives.map((obj, globalIdx) => {
    const krs = obj.keyResults.map((kr, krIdx) => {
      const progress = calcKRProgress(kr.type, kr.currentValue, kr.targetValue)
      return { ...kr, number: krIdx + 1, progress }
    })
    const objProgress = krs.length > 0
      ? Math.round(krs.reduce((s, kr) => s + kr.progress, 0) / krs.length)
      : 0
    return {
      id: obj.id,
      title: obj.title,
      year: obj.year ?? new Date(obj.startDate).getFullYear(),
      owner: obj.owner,
      ownerId: obj.ownerId,
      progress: objProgress,
      traffic: progressToTrafficLight(objProgress),
      status: progressToOKRStatus(objProgress),
      krs,
    }
  })

  // Group by year
  const byYear = new Map<number, typeof objectives>()
  for (const obj of objectives) {
    const list = byYear.get(obj.year) ?? []
    list.push(obj)
    byYear.set(obj.year, list)
  }
  const years = [...byYear.keys()].sort((a, b) => b - a)

  // Company-wide summary
  const totalProgress = objectives.length > 0
    ? Math.round(objectives.reduce((s, o) => s + o.progress, 0) / objectives.length)
    : 0
  const overallTraffic = progressToTrafficLight(totalProgress)
  const onTrack  = objectives.filter((o) => o.status === "on_track").length
  const atRisk   = objectives.filter((o) => o.status === "at_risk").length
  const offTrack = objectives.filter((o) => o.status === "off_track").length

  const canCreate = canManageCompanyObjective(userCtx)

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Empresa" },
      ]}
    >
      {/* ── Page header ── */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">ORCs Empresariales</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Objetivos anuales corporativos · Grupo AM
          </p>
        </div>
        {canCreate && (
          <Link
            href="/dashboard/company/new"
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors"
          >
            <span className="text-base leading-none">+</span> Nuevo ORC
          </Link>
        )}
      </div>

      {/* ── Company summary card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-8">
        <div className="h-1 bg-brand-500" />
        <div className="p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Grupo AM</h2>
              <p className="text-sm text-gray-400 mt-0.5">Resumen anual corporativo</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-gray-900">{totalProgress}%</span>
              <p className="text-xs text-gray-400 mt-0.5">Progreso general</p>
            </div>
          </div>

          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-brand-500 rounded-full transition-all duration-500"
              style={{ width: `${totalProgress}%` }}
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${TRAFFIC[overallTraffic].badge}`}>
              <span className={`w-2 h-2 rounded-full ${TRAFFIC[overallTraffic].dot}`} />
              {TRAFFIC[overallTraffic].label}
            </span>
            <span className="text-xs text-gray-400">·</span>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span><span className="font-semibold text-brand-600">{onTrack}</span> en seguimiento</span>
              <span><span className="font-semibold text-amber-600">{atRisk}</span> en riesgo</span>
              <span><span className="font-semibold text-red-500">{offTrack}</span> retrasados</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Objectives by year ── */}
      {objectives.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-gray-400">No hay ORCs Empresariales activos.</p>
          {canCreate && (
            <Link
              href="/dashboard/company/new"
              className="mt-4 inline-flex text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              + Crear el primer ORC Empresarial
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-10">
          {years.map((year) => {
            const yearObjectives = byYear.get(year)!
            return (
              <div key={year}>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                  {year}
                </h2>
                <div className="space-y-4">
                  {yearObjectives.map((obj, idx) => (
                    <CompanyORCAccordion
                      key={obj.id}
                      obj={obj}
                      objNumber={idx + 1}
                      traffic={TRAFFIC}
                      canEdit={canManageCompanyObjective(userCtx, obj.ownerId)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </AppLayout>
  )
}
