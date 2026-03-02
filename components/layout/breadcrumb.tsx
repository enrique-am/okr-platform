import Link from "next/link"

export interface BreadcrumbItem {
  label: string
  href?: string
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-gray-400 mb-6 flex-wrap">
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-gray-300">/</span>}
            {isLast || !item.href ? (
              <span className={isLast ? "text-gray-700 font-medium" : "text-gray-400"}>
                {item.label}
              </span>
            ) : (
              <Link href={item.href} className="hover:text-gray-600 transition-colors">
                {item.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
