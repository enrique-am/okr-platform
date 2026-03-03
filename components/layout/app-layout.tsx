import type { ReactNode } from "react"
import { Navbar } from "./navbar"
import { Breadcrumb, type BreadcrumbItem } from "./breadcrumb"
import { ImpersonationBanner } from "./impersonation-banner"

interface AppLayoutProps {
  children: ReactNode
  breadcrumbs?: BreadcrumbItem[]
  maxWidth?: string
}

export function AppLayout({
  children,
  breadcrumbs,
  maxWidth = "max-w-7xl",
}: AppLayoutProps) {
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
    </div>
  )
}
