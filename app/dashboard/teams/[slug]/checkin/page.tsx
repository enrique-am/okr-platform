import { getServerSession } from "next-auth"
import { redirect, notFound } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppLayout } from "@/components/layout/app-layout"
import { CheckInForm } from "./checkin-form"
import type { ObjectiveGroup } from "./checkin-form"
import Link from "next/link"

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const team = await prisma.team.findUnique({
    where: { slug: params.slug },
    select: { name: true },
  })
  return {
    title: team ? `Registrar avance · ${team.name} – OKR Platform` : "Registrar avance",
  }
}

export default async function CheckInPage({ params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const team = await prisma.team.findUnique({
    where: { slug: params.slug },
    select: {
      id: true,
      name: true,
      slug: true,
      objectives: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          title: true,
          keyResults: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              title: true,
              type: true,
              currentValue: true,
              targetValue: true,
              unit: true,
            },
          },
        },
      },
    },
  })

  if (!team) notFound()

  const groups: ObjectiveGroup[] = team.objectives.map((obj, objIdx) => ({
    objectiveNumber: objIdx + 1,
    objectiveTitle: obj.title,
    krs: obj.keyResults.map((kr, krIdx) => ({
      id: kr.id,
      title: kr.title,
      type: kr.type,
      currentValue: kr.currentValue,
      targetValue: kr.targetValue,
      unit: kr.unit,
      krNumber: krIdx + 1,
    })),
  }))

  const totalKRs = groups.reduce((s, g) => s + g.krs.length, 0)

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: team.name, href: `/dashboard/teams/${team.slug}` },
        { label: "Registrar avance" },
      ]}
      maxWidth="max-w-2xl"
    >
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Registrar avance</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {team.name} · {totalKRs} resultado{totalKRs !== 1 ? "s" : ""} clave activo{totalKRs !== 1 ? "s" : ""}
        </p>
      </div>

      {totalKRs === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-gray-400">Este equipo no tiene RCs activos.</p>
          <Link
            href={`/dashboard/teams/${team.slug}`}
            className="mt-4 inline-flex text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            ← Volver al equipo
          </Link>
        </div>
      ) : (
        <CheckInForm teamSlug={team.slug} groups={groups} />
      )}
    </AppLayout>
  )
}
