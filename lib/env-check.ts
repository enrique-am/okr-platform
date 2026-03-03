const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "OPENAI_API_KEY",
  "RESEND_API_KEY",
  "CRON_SECRET",
] as const

export function checkEnvVars() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key])
  if (missing.length > 0) {
    console.error(
      "[env-check] Missing required environment variables:",
      missing.join(", ")
    )
  }
}
