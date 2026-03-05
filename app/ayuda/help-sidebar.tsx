"use client"

import { useEffect, useRef, useState } from "react"

interface SidebarSection {
  slug: string
  title: string
}

interface HelpSidebarProps {
  sections: SidebarSection[]
}

export function HelpSidebar({ sections }: HelpSidebarProps) {
  const [activeSlug, setActiveSlug] = useState<string>(sections[0]?.slug ?? "")
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) {
          setActiveSlug(visible[0].target.id)
        }
      },
      { rootMargin: "-56px 0px -60% 0px", threshold: 0 }
    )

    sections.forEach(({ slug }) => {
      const el = document.getElementById(slug)
      if (el) observerRef.current!.observe(el)
    })

    return () => observerRef.current?.disconnect()
  }, [sections])

  function scrollTo(slug: string) {
    const el = document.getElementById(slug)
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - 72
    window.scrollTo({ top, behavior: "smooth" })
    setActiveSlug(slug)
  }

  return (
    <nav className="sticky top-[56px] max-h-[calc(100vh-56px)] overflow-y-auto py-6 pr-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 px-3">
        Contenido
      </p>
      <ul className="space-y-0.5">
        {sections.map(({ slug, title }) => (
          <li key={slug}>
            <button
              onClick={() => scrollTo(slug)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                activeSlug === slug
                  ? "bg-brand-50 text-brand-700 font-semibold"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              {title}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
