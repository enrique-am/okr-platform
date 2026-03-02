import { getServerSession } from "next-auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Role, TrackingStatus, KeyResultType } from "@prisma/client"
import { NavBar } from "@/components/dashboard/nav-bar"
import type { Metadata } from "next"

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const team = await prisma.team.findUnique({
    where: { slug: params.slug },
    select: { name: true },
  })
  return { title: team ? `${team.name} – OKR Platform` : "Equipo – OKR Platform" }
}

// ─── Config maps ─────────────────────────────────────────────────────────────

const TRACKING_CONFIG: Record<
  TrackingStatus,
  { label: string; dot: string; bar: string; badge: string; border: string }
> = {
  ON_TRACK: {
    label: "En seguimiento",
    dot: "bg-brand-500",
    bar: "bg-brand-500",
    badge: "bg-brand-50 text-brand-700",
    border: "border-brand-200",
  },
  AT_RISK: {
    label: "En riesgo",
    dot: "bg-amber-400",
    bar: "bg-amber-400",
    badge: "bg-amber-50 text-amber-700",
    border: "border-amber-200",
  },
  OFF_TRACK: {
    label: "Retrasado",
    dot: "bg-red-400",
    bar: "bg-red-400",
    badge: "bg-red-50 text-red-600",
    border: "border-red-200",
  },
}

const KR_TYPE_LABELS: Record<KeyResultType, string> = {
  PERCENTAGE: "Porcentaje",
  NUMBER: "Número",
  CURRENCY: "Moneda",
  BOOLEAN: "Sí / No",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcProgress(
  type: KeyResultType,
  currentValue: number,
  targetValue: number
): number {
  if (type === KeyResultType.BOOLEAN) return currentValue > 0 ? 100 : 0
  return targetValue > 0
    ? Math.min(100, Math.round((currentValue / targetValue) * 100))
    : 0
}

function formatValue(
  type: KeyResultType,
  currentValue: number,
  targetValue: number,
  unit: string | null
): string {
  if (type === KeyResultType.BOOLEAN) {
    return currentValue > 0 ? "Sí" : "No"
  }
  const u = unit ? ` ${unit}` : ""
  return `${currentValue}${u} / ${targetValue}${u}`
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatCheckInValue(
  type: KeyResultType,
  value: number,
  unit: string | null
): string {
  if (type === KeyResultType.BOOLEAN) return value > 0 ? "Completado" : "Pendiente"
  const u = unit ? ` ${unit}` : ""
  return `${value}${u}`
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function TeamPage({
  params,
}: {
  params: { slug: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const team = await prisma.team.findUnique({
    where: { slug: params.slug },
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
            include: {
              checkIns: {
                orderBy: { createdAt: "desc" },
                take: 3,
                include: { author: { select: { name: true } } },
              },
            },
          },
        },
      },
    },
  })

  if (!team) notFound()

  const lead = team.members[0]?.name ?? "Sin líder asignado"

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar user={session.user} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/dashboard" className="hover:text-gray-600">Dashboard</Link>
          <span>/</span>
          <span className="text-gray-700 font-medium">{team.name}</span>
        </div>

        {/* Team header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-8">
          <div className="h-1 bg-brand-500" />
          <div className="px-6 py-5 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
              <p className="text-sm text-gray-400 mt-1">{lead}</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                {team.objectives.length}{" "}
                {team.objectives.length === 1 ? "objetivo activo" : "objetivos activos"}
              </span>
              <Link
                href={`/dashboard/teams/${team.slug}/checkin`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z"
                    clipRule="evenodd"
                  />
                </svg>
                Registrar avance
              </Link>
            </div>
          </div>
        </div>

        {/* OKR list */}
        {team.objectives.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-16">
            Este equipo no tiene objetivos activos.
          </p>
        ) : (
          <div className="space-y-6">
            {team.objectives.map((obj, objIdx) => {
              const objNumber = objIdx + 1
              const tsCfg = TRACKING_CONFIG[obj.trackingStatus]

              const krsWithProgress = obj.keyResults.map((kr, krIdx) => ({
                ...kr,
                number: krIdx + 1,
                progress: calcProgress(kr.type, kr.currentValue, kr.targetValue),
              }))

              const objProgress =
                krsWithProgress.length > 0
                  ? Math.round(
                      krsWithProgress.reduce((s, kr) => s + kr.progress, 0) /
                        krsWithProgress.length
                    )
                  : 0

              return (
                <section
                  key={obj.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                >
                  {/* OKR header */}
                  <div className="px-6 pt-5 pb-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="flex-shrink-0 mt-0.5 inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-500 tabular-nums">
                          ORC {objNumber}
                        </span>
                        <h2 className="text-base font-semibold text-gray-900 leading-snug">
                          {obj.title}
                        </h2>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${tsCfg.badge}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${tsCfg.dot}`} />
                          {tsCfg.label}
                        </span>
                        <Link
                          href={`/dashboard/${obj.id}/edit`}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-brand-600 transition-colors px-2 py-1 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="w-3 h-3"
                          >
                            <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                          </svg>
                          Editar
                        </Link>
                      </div>
                    </div>

                    {/* OKR progress bar */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${tsCfg.bar}`}
                          style={{ width: `${objProgress}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-600 tabular-nums w-10 text-right">
                        {objProgress}%
                      </span>
                    </div>
                  </div>

                  {/* KR list */}
                  {krsWithProgress.length > 0 && (
                    <div className="border-t border-gray-100 divide-y divide-gray-50">
                      {krsWithProgress.map((kr) => {
                        const krCfg = TRACKING_CONFIG[kr.trackingStatus]
                        const valueStr = formatValue(
                          kr.type,
                          kr.currentValue,
                          kr.targetValue,
                          kr.unit
                        )

                        return (
                          <div key={kr.id} className="px-6 py-4">
                            {/* KR header */}
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex items-start gap-2 min-w-0">
                                <span className="flex-shrink-0 mt-0.5 text-xs font-bold text-gray-400 tabular-nums">
                                  RC {objNumber}.{kr.number}
                                </span>
                                <p className="text-sm font-medium text-gray-800 leading-snug">
                                  {kr.title}
                                </p>
                              </div>
                              <span
                                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${krCfg.badge}`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${krCfg.dot}`}
                                />
                                {krCfg.label}
                              </span>
                            </div>

                            {/* Progress bar */}
                            <div className="flex items-center gap-3 mb-2.5">
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${krCfg.bar}`}
                                  style={{ width: `${kr.progress}%` }}
                                />
                              </div>
                              <span className="text-xs font-semibold text-gray-500 tabular-nums w-8 text-right">
                                {kr.progress}%
                              </span>
                            </div>

                            {/* Meta row: type · current / target */}
                            <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                              <span className="font-medium text-gray-500">
                                {KR_TYPE_LABELS[kr.type]}
                              </span>
                              <span>·</span>
                              <span>Actual: {valueStr.split(" / ")[0]}</span>
                              <span>·</span>
                              <span>Objetivo: {valueStr.split(" / ")[1]}</span>
                            </div>

                            {/* KR notes */}
                            {kr.description && (
                              <p className="text-xs text-gray-400 italic leading-relaxed mb-3">
                                {kr.description}
                              </p>
                            )}

                            {/* Check-in history */}
                            {kr.checkIns.length > 0 && (
                              <div className="mt-1">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                  Últimos avances
                                </p>
                                <div className="space-y-2">
                                  {kr.checkIns.map((ci, ciIdx) => (
                                    <div key={ci.id} className="flex items-start gap-2.5">
                                      {/* Timeline dot + line */}
                                      <div className="flex flex-col items-center flex-shrink-0 mt-0.5">
                                        <span
                                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                            ciIdx === 0 ? "bg-brand-500" : "bg-gray-300"
                                          }`}
                                        />
                                        {ciIdx < kr.checkIns.length - 1 && (
                                          <span className="w-px flex-1 bg-gray-200 mt-1 min-h-[12px]" />
                                        )}
                                      </div>

                                      {/* Content */}
                                      <div className="pb-2 min-w-0">
                                        <div className="flex items-baseline gap-2 flex-wrap">
                                          <span className="text-xs text-gray-400">
                                            {formatDate(ci.createdAt)}
                                          </span>
                                          <span className="text-xs font-semibold text-gray-700 tabular-nums">
                                            → {formatCheckInValue(kr.type, ci.value, kr.unit)}
                                          </span>
                                          {ci.author.name && (
                                            <span className="text-xs text-gray-400">
                                              — {ci.author.name.split(" ")[0]}
                                            </span>
                                          )}
                                        </div>
                                        {ci.note && (
                                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                                            {ci.note}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
