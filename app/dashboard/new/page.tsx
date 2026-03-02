import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NavBar } from "@/components/dashboard/nav-bar"
import { ObjectiveForm } from "./objective-form"

export const metadata = { title: "Nuevo objetivo – OKR Platform" }

export default async function NewObjectivePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const teams = await prisma.team.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar user={session.user} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/dashboard" className="hover:text-gray-600">Dashboard</Link>
          <span>/</span>
          <span className="text-gray-700 font-medium">Nuevo objetivo</span>
        </div>

        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Nuevo objetivo</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Define el objetivo y sus resultados clave para el seguimiento del equipo.
          </p>
        </div>

        <ObjectiveForm teams={teams} />
      </main>
    </div>
  )
}
