import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppLayout } from "@/components/layout/app-layout"
import { HelpSidebar } from "./help-sidebar"
import { HelpPillNav } from "./help-pill-nav"
import DOMPurify from "isomorphic-dompurify"

export const metadata = {
  title: "Centro de ayuda – ORCs Grupo AM",
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default async function AyudaPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const sections = await prisma.helpSection.findMany({
    where: { isPublished: true },
    orderBy: { order: "asc" },
    include: {
      documents: { orderBy: { order: "asc" }, select: { id: true, title: true, filename: true, fileSize: true } },
    },
  })

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Centro de ayuda</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Todo lo que necesitas saber para usar la plataforma ORC de Grupo AM.
        </p>
      </div>

      {/* Mobile pill nav — rendered above the flex row, hidden on lg+ */}
      <HelpPillNav sections={sections.map((s) => ({ slug: s.slug, title: s.title }))} />

      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <HelpSidebar
            sections={sections.map((s) => ({ slug: s.slug, title: s.title }))}
          />
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 space-y-12">
          {sections.map((section) => (
            <section key={section.id} id={section.slug} className="scroll-mt-[120px] lg:scroll-mt-20">
              <div className="border-b border-gray-200 pb-3 mb-6">
                <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
              </div>

              {/* HTML content */}
              <div
                className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-p:text-gray-600 prose-li:text-gray-600 prose-strong:text-gray-800 prose-a:text-brand-600 prose-blockquote:border-brand-400"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(section.content, {
                    ALLOWED_TAGS: ["p","h1","h2","h3","h4","h5","h6","ul","ol","li","strong","em","a","blockquote","img","br","hr","code","pre"],
                    ALLOWED_ATTR: ["href","src","alt","title","target","rel","class"],
                  }),
                }}
              />

              {/* PDF attachments */}
              {section.documents.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                    Documentos adjuntos
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {section.documents.map((doc) => (
                      <a
                        key={doc.id}
                        href={`/api/help/documents/${doc.id}`}
                        download={doc.filename}
                        className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 hover:border-brand-300 hover:bg-brand-50 transition-colors group"
                      >
                        <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0 group-hover:bg-red-100 transition-colors">
                          <span className="text-red-600 font-bold text-[10px] leading-none">PDF</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                          <p className="text-xs text-gray-400">{formatBytes(doc.fileSize)}</p>
                        </div>
                        <svg className="ml-auto w-4 h-4 text-gray-400 group-hover:text-brand-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </section>
          ))}

          {sections.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-sm">No hay secciones publicadas todavía.</p>
            </div>
          )}
        </main>
      </div>
    </AppLayout>
  )
}
