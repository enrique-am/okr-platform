import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppLayout } from "@/components/layout/app-layout"
import { AdminNav } from "@/components/admin/admin-nav"
import { ActivityTable } from "./activity-table"

interface SearchParams {
  user?: string
  team?: string
  action?: string
  from?: string
  to?: string
}

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== "ADMIN") redirect("/dashboard")

  const where: Record<string, unknown> = {}

  if (searchParams.user) where.userId = searchParams.user
  if (searchParams.team) where.user = { userTeams: { some: { teamId: searchParams.team } } }
  if (searchParams.action) where.action = searchParams.action
  if (searchParams.from || searchParams.to) {
    where.createdAt = {
      ...(searchParams.from ? { gte: new Date(searchParams.from) } : {}),
      ...(searchParams.to ? { lte: new Date(searchParams.to + "T23:59:59.999Z") } : {}),
    }
  }

  const [logs, users, teams] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            userTeams: { take: 1, select: { team: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.team.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  const serializedLogs = logs.map((log) => ({
    id: log.id,
    action: log.action,
    metadata: log.metadata as Record<string, unknown>,
    createdAt: log.createdAt.toISOString(),
    user: {
      id: log.user.id,
      name: log.user.name,
      email: log.user.email,
      teamName: log.user.userTeams[0]?.team?.name ?? null,
    },
  }))

  return (
    <AppLayout breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Actividad" }]}>
      <AdminNav />
      <ActivityTable
        logs={serializedLogs}
        users={users}
        teams={teams}
        filters={{
          user: searchParams.user ?? "",
          team: searchParams.team ?? "",
          action: searchParams.action ?? "",
          from: searchParams.from ?? "",
          to: searchParams.to ?? "",
        }}
      />
    </AppLayout>
  )
}
