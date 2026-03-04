/**
 * One-time migration: read each user's existing `teamId` and create the
 * corresponding `UserTeam` record before we drop the column.
 *
 * Run with: npx tsx scripts/migrate-teams.ts
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const users = await (prisma.user as any).findMany({
    where: { teamId: { not: null } },
    select: { id: true, teamId: true },
  })

  console.log(`Found ${users.length} users with a teamId. Migrating...`)

  let created = 0
  for (const u of users) {
    if (!u.teamId) continue
    await prisma.userTeam.upsert({
      where: { userId_teamId: { userId: u.id, teamId: u.teamId } },
      create: { userId: u.id, teamId: u.teamId },
      update: {},
    })
    created++
  }

  console.log(`Done — ${created} UserTeam records created.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
