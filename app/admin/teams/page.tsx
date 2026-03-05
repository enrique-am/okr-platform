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
      _count: { select: { userTeams: true } },
      objectives: {
        where: { status: "ACTIVE" },
        select: { id: true },
      },
      lead: { select: { id: true, name: true } },
      userTeams: {
        select: { user: { select: { id: true, name: true, role: true } } },
      },
    },
    orderBy: { name: "asc" },
  })

  const serialized = teams.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    activeORCs: t.objectives.length,
    members: t._count.userTeams,
    memberNames: t.userTeams.slice(0, 5).map((ut) => ut.user.name ?? "Sin nombre"),
    leadId: t.leadId,
    leadName: t.lead?.name ?? null,
    eligibleLeads: t.userTeams
      .filter((ut) => ut.user.role === "LEAD" || ut.user.role === "ADMIN")
      .map((ut) => ({ id: ut.user.id, name: ut.user.name ?? "Sin nombre" })),
  }))

  return (
    <AppLayout maxWidth="w-[1120px]">
      <AdminNav />
      <TeamsTable teams={serialized} />
    </AppLayout>
  )
}
