"use client"

import { useState, useRef, useEffect } from "react"

interface DataSource {
  name: string
  url: string | null
  instructions: string | null
}

export function DataSourceBadge({ dataSource }: { dataSource: DataSource }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-xs font-medium border border-brand-200 hover:bg-brand-100 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="w-3 h-3 flex-shrink-0"
        >
          <path d="M8 1a5 5 0 1 0 0 10A5 5 0 0 0 8 1ZM6.22 5.22a.75.75 0 0 1 1.06 0L8 5.94l.72-.72a.75.75 0 1 1 1.06 1.06L9.06 7l.72.72a.75.75 0 0 1-1.06 1.06L8 8.06l-.72.72a.75.75 0 0 1-1.06-1.06L6.94 7l-.72-.72a.75.75 0 0 1 0-1.06Z" />
        </svg>
        Fuente vinculada
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-20 w-72 bg-white rounded-xl border border-gray-200 shadow-lg p-4 space-y-2">
          <p className="text-sm font-semibold text-gray-900">{dataSource.name}</p>

          {dataSource.url && (
            <a
              href={dataSource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="w-3 h-3"
              >
                <path
                  fillRule="evenodd"
                  d="M8.914 6.025a.75.75 0 0 1 1.06 0 3.5 3.5 0 0 1 0 4.95l-2 2a3.5 3.5 0 0 1-4.95-4.95l1.5-1.5a.75.75 0 0 1 1.06 1.06l-1.5 1.5a2 2 0 0 0 2.83 2.83l2-2a2 2 0 0 0 0-2.83.75.75 0 0 1 0-1.06Z"
                  clipRule="evenodd"
                />
                <path
                  fillRule="evenodd"
                  d="M7.086 9.975a.75.75 0 0 1-1.06 0 3.5 3.5 0 0 1 0-4.95l2-2a3.5 3.5 0 0 1 4.95 4.95l-1.5 1.5a.75.75 0 0 1-1.06-1.06l1.5-1.5a2 2 0 0 0-2.83-2.83l-2 2a2 2 0 0 0 0 2.83.75.75 0 0 1 0 1.06Z"
                  clipRule="evenodd"
                />
              </svg>
              Abrir fuente
            </a>
          )}

          {dataSource.instructions && (
            <p className="text-xs text-gray-500 leading-relaxed">{dataSource.instructions}</p>
          )}
        </div>
      )}
    </div>
  )
}
