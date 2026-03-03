import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppLayout } from "@/components/layout/app-layout"
import { AdminNav } from "@/components/admin/admin-nav"
import { UsersTable } from "./users-table"

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions)
  const currentUserId = session?.user?.id ?? ""

  const [users, teams] = await Promise.all([
    prisma.user.findMany({
      include: { team: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.team.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  const serialized = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    teamId: u.teamId,
    team: u.team,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    memberSince: u.createdAt.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
  }))

  return (
    <AppLayout breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Usuarios" }]}>
      <AdminNav />
      <UsersTable users={serialized} teams={teams} currentUserId={currentUserId} />
    </AppLayout>
  )
}
