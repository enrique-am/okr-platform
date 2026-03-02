import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { NavBar } from "@/components/dashboard/nav-bar"
import { AdminNav } from "@/components/admin/admin-nav"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Admin – OKR Platform" }

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (session.user.role !== "ADMIN") redirect("/dashboard")

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar user={session.user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Administración</h1>
          <p className="text-sm text-gray-400 mt-0.5">Gestión de usuarios y equipos</p>
        </div>

        <AdminNav />

        <div className="mt-6">{children}</div>
      </main>
    </div>
  )
}
