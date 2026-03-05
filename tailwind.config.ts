import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2faea",
          100: "#e0f4cc",
          200: "#c2e99a",
          300: "#9dd966",
          400: "#84cd50",
          500: "#72bf44",
          600: "#5aa034",
          700: "#447828",
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
}

export default config
