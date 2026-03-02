import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Admin – OKR Platform" }

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (session.user.role !== "ADMIN") redirect("/dashboard")

  return <>{children}</>
}
