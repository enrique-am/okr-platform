import { prisma } from "@/lib/prisma"
import { AppLayout } from "@/components/layout/app-layout"
import { AdminNav } from "@/components/admin/admin-nav"
import { SectionList } from "./section-list"

export const metadata = {
  title: "Ayuda — Admin",
}

export default async function AdminAyudaPage() {
  const sections = await prisma.helpSection.findMany({
    orderBy: { order: "asc" },
    include: {
      _count: { select: { documents: true } },
      documents: { orderBy: { order: "asc" }, select: { id: true, title: true, filename: true, fileSize: true } },
    },
  })

  return (
    <AppLayout maxWidth="w-[1120px]">
      <AdminNav />

      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Centro de ayuda</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestiona las secciones y documentos del centro de ayuda. Arrastra para reordenar.
        </p>
      </div>

      <SectionList initialSections={sections} />
    </AppLayout>
  )
}
