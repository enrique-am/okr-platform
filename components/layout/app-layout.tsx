import type { ReactNode } from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Navbar } from "./navbar"
import { Breadcrumb, type BreadcrumbItem } from "./breadcrumb"
import { ImpersonationBanner } from "./impersonation-banner"
import { BetaBanner } from "./beta-banner"
import { FeedbackWidget } from "@/components/feedback/feedback-widget"
import { Footer } from "./footer"

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

  // Fetch the first team name for the feedback widget
  let teamName: string | null = null
  const firstTeamId = session?.user?.teamIds?.[0]
  if (firstTeamId) {
    const team = await prisma.team.findUnique({
      where: { id: firstTeamId },
      select: { name: true },
    })
    teamName = team?.name ?? null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ImpersonationBanner />
      <BetaBanner />
      <Navbar />
      <main className={`${maxWidth} mx-auto px-4 sm:px-6 py-8 flex-1`}>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumb items={breadcrumbs} />
        )}
        {children}
      </main>
      <Footer />

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
