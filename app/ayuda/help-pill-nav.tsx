"use client"

import { useEffect, useRef, useState } from "react"

interface Section {
  slug: string
  title: string
}

export function HelpPillNav({ sections }: { sections: Section[] }) {
  const [activeSlug, setActiveSlug] = useState<string>(sections[0]?.slug ?? "")
  const [open, setOpen] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const navRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) setActiveSlug(visible[0].target.id)
      },
      { rootMargin: "-120px 0px -60% 0px", threshold: 0 }
    )

    sections.forEach(({ slug }) => {
      const el = document.getElementById(slug)
      if (el) observerRef.current!.observe(el)
    })

    return () => observerRef.current?.disconnect()
  }, [sections])

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  function scrollTo(slug: string) {
    const el = document.getElementById(slug)
    if (!el) return
    const navbarHeight = 56
    const navHeight = navRef.current?.offsetHeight ?? 56
    const top = el.getBoundingClientRect().top + window.scrollY - navbarHeight - navHeight - 8
    window.scrollTo({ top, behavior: "smooth" })
    setActiveSlug(slug)
    setOpen(false)
  }

  const activeTitle = sections.find((s) => s.slug === activeSlug)?.title ?? "Secciones"

  return (
    <div
      ref={navRef}
      className="lg:hidden sticky top-[56px] z-30 bg-white border-b border-gray-100 -mx-4 sm:-mx-6 px-4 sm:px-6 mb-6"
    >
      <div className="py-3 relative" ref={dropdownRef}>
        {/* Trigger button */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <span className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-[#72bf44] flex-shrink-0" />
            <span className="truncate">{activeTitle}</span>
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          >
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Dropdown list */}
        {open && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-40">
            {sections.map(({ slug, title }) => {
              const isActive = activeSlug === slug
              return (
                <button
                  key={slug}
                  type="button"
                  onClick={() => scrollTo(slug)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                    isActive
                      ? "bg-brand-50 text-brand-700 font-semibold"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#72bf44] flex-shrink-0" />}
                  <span className={isActive ? "" : "pl-[18px]"}>{title}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
