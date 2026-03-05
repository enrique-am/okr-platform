import Image from "next/image"

interface LogoProps {
  size?: "sm" | "md" | "lg"
  showText?: boolean
}

const sizes = {
  sm: { img: 24, text: "text-sm font-semibold" },
  md: { img: 28, text: "text-sm font-bold" },
  lg: { img: 300, text: "text-xl font-semibold" },
}

export function Logo({ size = "md", showText = false }: LogoProps) {
  const s = sizes[size]
  return (
    <div className="flex items-center gap-2.5">
      <Image
        src="/logo.png"
        alt="Grupo AM"
        width={s.img}
        height={s.img}
        className="flex-shrink-0"
      />
      {showText && (
        <span className={`${s.text} text-gray-900 tracking-tight`}>Grupo AM</span>
      )}
    </div>
  )
}
