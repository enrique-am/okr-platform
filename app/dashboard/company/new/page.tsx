import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppLayout } from "@/components/layout/app-layout"
import { CompanyObjectiveForm } from "./company-objective-form"
import { canManageCompanyObjective } from "@/lib/permissions"

export const metadata = { title: "Nuevo ORC Empresarial – OKR Platform" }

export default async function NewCompanyObjectivePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  if (!canManageCompanyObjective(session.user)) {
    redirect("/dashboard/company")
  }

  const leads = await prisma.user.findMany({
    where: { role: { in: ["LEAD", "EXECUTIVE"] }, status: "ACTIVE" },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  })

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Empresa", href: "/dashboard/company" },
        { label: "Nuevo ORC Empresarial" },
      ]}
      maxWidth="max-w-3xl"
    >
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Nuevo ORC Empresarial</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Define un objetivo anual a nivel corporativo con sus resultados clave.
        </p>
      </div>
      <CompanyObjectiveForm leads={leads} />
    </AppLayout>
  )
}
