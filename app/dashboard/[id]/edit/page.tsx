import { getServerSession } from "next-auth"
import { redirect, notFound } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppLayout } from "@/components/layout/app-layout"
import { EditObjectiveForm } from "./edit-objective-form"
import { canEditObjective } from "@/lib/permissions"

export const metadata = { title: "Editar objetivo – OKR Platform" }

function dateToQuarter(date: Date): { quarter: 1 | 2 | 3 | 4; year: number } {
  const month = date.getMonth()
  const quarter = (Math.floor(month / 3) + 1) as 1 | 2 | 3 | 4
  return { quarter, year: date.getFullYear() }
}

export default async function EditObjectivePage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const [objective, teams] = await Promise.all([
    prisma.objective.findUnique({
      where: { id: params.id },
      include: {
        keyResults: {
          orderBy: { createdAt: "asc" },
          include: { dataSource: true },
        },
        team: { select: { name: true, slug: true } },
      },
    }),
    prisma.team.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  if (!objective) notFound()

  // Guard: redirect unauthorized users before rendering the form
  if (
    !canEditObjective(
      { id: session.user.id, role: session.user.role, teamId: session.user.teamId },
      objective.teamId
    )
  ) {
    redirect("/dashboard")
  }

  const objectiveNumber = objective.teamId
    ? await (async () => {
        const siblings = await prisma.objective.findMany({
          where: { teamId: objective.teamId! },
          select: { id: true },
          orderBy: { createdAt: "asc" },
        })
        const idx = siblings.findIndex((o) => o.id === objective.id)
        return idx >= 0 ? idx + 1 : null
      })()
    : null

  const { quarter, year } = dateToQuarter(objective.startDate)

  const initialData = {
    title: objective.title,
    teamId: objective.teamId ?? "",
    quarter,
    year,
    objectiveStatus: objective.status as "ACTIVE" | "COMPLETED" | "CANCELLED",
    keyResults: objective.keyResults.map((kr) => ({
      id: kr.id,
      title: kr.title,
      type: kr.type,
      targetValue: kr.targetValue,
      currentValue: kr.currentValue,
      unit: kr.unit ?? "",
      description: kr.description ?? "",
      trackingStatus: kr.trackingStatus,
      dataSource: kr.dataSource
        ? { name: kr.dataSource.name, url: kr.dataSource.url, instructions: kr.dataSource.instructions }
        : null,
    })),
  }

  const okrLabel = objectiveNumber != null ? `ORC ${objectiveNumber}` : "ORC"

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    ...(objective.team
      ? [{ label: objective.team.name, href: `/dashboard/teams/${objective.team.slug}` }]
      : []),
    { label: `Editar ${okrLabel}` },
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs} maxWidth="max-w-3xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-500">
            {okrLabel}
          </span>
          <h1 className="text-xl font-semibold text-gray-900">Editar objetivo</h1>
        </div>
        <p className="text-sm text-gray-400">
          Actualiza el objetivo, sus resultados clave y valores actuales.
        </p>
      </div>
      <EditObjectiveForm
        objectiveId={params.id}
        objectiveNumber={objectiveNumber}
        teams={teams}
        initialData={initialData}
      />
    </AppLayout>
  )
}
