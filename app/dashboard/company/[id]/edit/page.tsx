import { getServerSession } from "next-auth"
import { redirect, notFound } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppLayout } from "@/components/layout/app-layout"
import { EditCompanyObjectiveForm } from "./edit-company-objective-form"
import { canManageCompanyObjective } from "@/lib/permissions"

export const metadata = { title: "Editar ORC Empresarial – OKR Platform" }

export default async function EditCompanyObjectivePage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const [objective, leads] = await Promise.all([
    prisma.objective.findUnique({
      where: { id: params.id },
      include: {
        keyResults: {
          orderBy: { createdAt: "asc" },
          include: { dataSource: true },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: { in: ["LEAD", "EXECUTIVE"] }, status: "ACTIVE" },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ])

  if (!objective || objective.level !== "COMPANY") notFound()

  if (!canManageCompanyObjective(session.user, objective.ownerId)) {
    redirect("/dashboard/company")
  }

  // Determine this objective's position among company objectives for this year
  const siblings = await prisma.objective.findMany({
    where: { level: "COMPANY", year: objective.year },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  })
  const idx = siblings.findIndex((o) => o.id === objective.id)
  const objectiveNumber = idx >= 0 ? idx + 1 : null

  const yr = objective.year ?? new Date().getFullYear()
  const initialData = {
    title: objective.title,
    year: yr,
    startDate: objective.startDate.toISOString().slice(0, 10),
    endDate: objective.endDate.toISOString().slice(0, 10),
    ownerId: objective.ownerId,
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

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Empresa", href: "/dashboard/company" },
        { label: `Editar ORC ${objectiveNumber ?? ""}` },
      ]}
      maxWidth="max-w-3xl"
    >
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          {objectiveNumber && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-purple-50 text-purple-600">
              ORC {objectiveNumber}
            </span>
          )}
          <h1 className="text-xl font-semibold text-gray-900">Editar ORC Empresarial</h1>
        </div>
        <p className="text-sm text-gray-400">Actualiza el objetivo anual y sus resultados clave.</p>
      </div>
      <EditCompanyObjectiveForm
        objectiveId={params.id}
        objectiveNumber={objectiveNumber}
        leads={leads}
        initialData={initialData}
      />
    </AppLayout>
  )
}
