import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppLayout } from "@/components/layout/app-layout"
import { AdminNav } from "@/components/admin/admin-nav"
import { TeamsTable } from "./teams-table"

export default async function AdminTeamsPage() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== "ADMIN") redirect("/dashboard")

  const teams = await prisma.team.findMany({
    include: {
      _count: { select: { members: true } },
      objectives: {
        where: { status: "ACTIVE" },
        select: { id: true },
      },
    },
    orderBy: { name: "asc" },
  })

  const serialized = teams.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    activeORCs: t.objectives.length,
    members: t._count.members,
  }))

  return (
    <AppLayout breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Equipos" }]}>
      <AdminNav />
      <TeamsTable teams={serialized} />
    </AppLayout>
  )
}
