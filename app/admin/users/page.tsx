import { prisma } from "@/lib/prisma"
import { UsersTable } from "./users-table"

export default async function AdminUsersPage() {
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

  // Serialize dates for client component
  const serialized = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    teamId: u.teamId,
    team: u.team,
    memberSince: u.createdAt.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
  }))

  return <UsersTable users={serialized} teams={teams} />
}
