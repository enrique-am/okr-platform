import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppLayout } from "@/components/layout/app-layout"
import { AdminNav } from "@/components/admin/admin-nav"
import { FeedbackTable } from "./feedback-table"
import { FeedbackType } from "@prisma/client"

interface SearchParams {
  type?: string
  user?: string
  status?: string
  from?: string
  to?: string
}

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== "ADMIN") redirect("/dashboard")

  const where: Record<string, unknown> = {}

  if (searchParams.type && Object.values(FeedbackType).includes(searchParams.type as FeedbackType)) {
    where.type = searchParams.type
  }
  if (searchParams.user) {
    where.userId = searchParams.user
  }
  if (searchParams.status === "read") where.read = true
  if (searchParams.status === "unread") where.read = false
  if (searchParams.from || searchParams.to) {
    where.createdAt = {
      ...(searchParams.from ? { gte: new Date(searchParams.from) } : {}),
      ...(searchParams.to ? { lte: new Date(searchParams.to + "T23:59:59.999Z") } : {}),
    }
  }

  const [reports, users, unreadCount] = await Promise.all([
    prisma.feedbackReport.findMany({
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
      orderBy: [{ read: "asc" }, { createdAt: "desc" }],
      take: 200,
    }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.feedbackReport.count({ where: { read: false } }),
  ])

  const serialized = reports.map((r) => ({
    id: r.id,
    type: r.type as "BUG" | "FEATURE",
    title: r.title,
    description: r.description,
    stepsToReproduce: r.stepsToReproduce,
    screenshotBase64: r.screenshotBase64,
    priority: r.priority as "HIGH" | "MEDIUM" | "LOW" | null,
    pageUrl: r.pageUrl,
    userAgent: r.userAgent,
    read: r.read,
    createdAt: r.createdAt.toISOString(),
    user: {
      id: r.user.id,
      name: r.user.name,
      email: r.user.email,
      teamName: r.user.userTeams[0]?.team?.name ?? null,
    },
  }))

  return (
    <AppLayout breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Feedback" }]}>
      <AdminNav />
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-900">
          Feedback
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-red-500 text-white text-xs font-bold">
              {unreadCount}
            </span>
          )}
        </h1>
      </div>
      <FeedbackTable
        reports={serialized}
        users={users}
        filters={{
          type: searchParams.type ?? "",
          user: searchParams.user ?? "",
          status: searchParams.status ?? "",
          from: searchParams.from ?? "",
          to: searchParams.to ?? "",
        }}
      />
    </AppLayout>
  )
}
