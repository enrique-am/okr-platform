"use client"

import { useEffect } from "react"
import { createPortal } from "react-dom"

export interface ToastItem {
  id: string
  message: string
  primary?: boolean
}

interface ToastListProps {
  toasts: ToastItem[]
  onRemove: (id: string) => void
}

function Toast({ toast, onRemove }: { toast: ToastItem; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 5000)
    return () => clearTimeout(timer)
  }, [toast.id, onRemove])

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm max-w-sm cursor-pointer transition-all ${
        toast.primary
          ? "bg-gray-900 text-white"
          : "bg-white border border-gray-200 text-gray-800"
      }`}
      onClick={() => onRemove(toast.id)}
    >
      <span className="leading-snug">{toast.message}</span>
    </div>
  )
}

export function ToastList({ toasts, onRemove }: ToastListProps) {
  if (toasts.length === 0) return null

  return createPortal(
    <div className="fixed bottom-6 right-4 z-50 flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <Toast toast={t} onRemove={onRemove} />
        </div>
      ))}
    </div>,
    document.body
  )
}
