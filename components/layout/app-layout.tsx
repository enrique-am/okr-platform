import type { ReactNode } from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Navbar } from "./navbar"
import { Breadcrumb, type BreadcrumbItem } from "./breadcrumb"
import { ImpersonationBanner } from "./impersonation-banner"
import { FeedbackWidget } from "@/components/feedback/feedback-widget"

interface AppLayoutProps {
  children: ReactNode
  breadcrumbs?: BreadcrumbItem[]
  maxWidth?: string
}

export async function AppLayout({
  children,
  breadcrumbs,
  maxWidth = "max-w-7xl",
}: AppLayoutProps) {
  const session = await getServerSession(authOptions)

  // Fetch team name for the feedback widget (session only stores teamId)
  let teamName: string | null = null
  if (session?.user?.teamId) {
    const team = await prisma.team.findUnique({
      where: { id: session.user.teamId },
      select: { name: true },
    })
    teamName = team?.name ?? null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ImpersonationBanner />
      <Navbar />
      <main className={`${maxWidth} mx-auto px-4 sm:px-6 py-8`}>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumb items={breadcrumbs} />
        )}
        {children}
      </main>

      {session?.user && (
        <FeedbackWidget
          userName={session.user.name ?? null}
          userEmail={session.user.email ?? ""}
          userRole={session.user.role ?? ""}
          teamName={teamName}
        />
      )}
    </div>
  )
}
