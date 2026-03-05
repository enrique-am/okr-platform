import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppLayout } from "@/components/layout/app-layout"
import { AdminNav } from "@/components/admin/admin-nav"
import { UsersTable } from "./users-table"

const PAGE_SIZE = 20

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== "ADMIN") redirect("/dashboard")
  const currentUserId = session.user.id

  const page = Math.max(1, Number(searchParams.page) || 1)
  const skip = (page - 1) * PAGE_SIZE

  const [users, teams, totalUsers] = await Promise.all([
    prisma.user.findMany({
      include: {
        userTeams: { select: { team: { select: { id: true, name: true } } } },
      },
      orderBy: { name: "asc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.team.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.count(),
  ])

  const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE))

  const serialized = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    teams: u.userTeams.map((ut) => ut.team),
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    memberSince: u.createdAt.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    hasCompletedOnboarding: u.hasCompletedOnboarding,
  }))

  return (
    <AppLayout maxWidth="w-[1120px]">
      <AdminNav />
      <UsersTable
        users={serialized}
        teams={teams}
        currentUserId={currentUserId}
        page={page}
        totalPages={totalPages}
        totalUsers={totalUsers}
      />
    </AppLayout>
  )
}
