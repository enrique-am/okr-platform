import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Providers } from "@/components/providers"
import { checkEnvVars } from "@/lib/env-check"
import "./globals.css"

checkEnvVars()

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "OKR Platform – Grupo AM",
  description: "Internal OKR tracking platform for Grupo AM",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
          <Providers>{children}</Providers>
        </body>
    </html>
  )
}
