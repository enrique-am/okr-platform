import { getServerSession } from "next-auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NavBar } from "@/components/dashboard/nav-bar"
import { EditObjectiveForm } from "./edit-objective-form"

export const metadata = { title: "Editar objetivo – OKR Platform" }

function dateToQuarter(date: Date): { quarter: 1 | 2 | 3 | 4; year: number } {
  const month = date.getMonth() // 0-indexed
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
      include: { keyResults: { orderBy: { createdAt: "asc" } } },
    }),
    prisma.team.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  if (!objective) notFound()

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
    })),
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar user={session.user} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6 min-w-0">
          <Link href="/dashboard" className="hover:text-gray-600 flex-shrink-0">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-gray-700 font-medium truncate">{objective.title}</span>
        </div>

        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Editar objetivo</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Actualiza el objetivo, sus resultados clave y valores actuales.
          </p>
        </div>

        <EditObjectiveForm
          objectiveId={params.id}
          teams={teams}
          initialData={initialData}
        />
      </main>
    </div>
  )
}
