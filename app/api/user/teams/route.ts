import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ teamNames: [] })
  }

  const userTeams = await prisma.userTeam.findMany({
    where: { userId: session.user.id },
    select: { team: { select: { name: true } } },
  })

  return NextResponse.json({
    teamNames: userTeams.map((ut) => ut.team.name),
  })
}
