import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppLayout } from "@/components/layout/app-layout"
import { ObjectiveForm } from "./objective-form"
import { canCreateObjective } from "@/lib/permissions"

export const metadata = { title: "Nuevo objetivo – OKR Platform" }

export default async function NewObjectivePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  // Guard: only ADMIN and LEAD can access the create form
  if (!canCreateObjective({ id: session.user.id, role: session.user.role, teamId: session.user.teamId })) {
    redirect("/dashboard")
  }

  const teams = await prisma.team.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Nuevo ORC" },
      ]}
      maxWidth="max-w-3xl"
    >
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Nuevo objetivo</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Define el objetivo y sus resultados clave para el seguimiento del equipo.
        </p>
      </div>
      <ObjectiveForm teams={teams} />
    </AppLayout>
  )
}
