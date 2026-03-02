import { prisma } from "@/lib/prisma"
import { TeamsTable } from "./teams-table"

export default async function AdminTeamsPage() {
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

  return <TeamsTable teams={serialized} />
}
