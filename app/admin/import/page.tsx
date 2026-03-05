import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppLayout } from "@/components/layout/app-layout"
import { AdminNav } from "@/components/admin/admin-nav"
import { ImportClient } from "./import-client"

export const metadata = { title: "Importar CSV – OKR Platform" }

export default async function ImportPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (session.user.role !== "ADMIN") redirect("/dashboard")

  const teams = await prisma.team.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  })

  return (
    <AppLayout
      maxWidth="w-[1120px]"
    >
      <AdminNav />
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">
          Importar ORCs desde CSV
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Carga objetivos y resultados clave desde un archivo exportado
        </p>
      </div>
      <ImportClient teams={teams} />
    </AppLayout>
  )
}
