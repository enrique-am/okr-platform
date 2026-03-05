// Cookie names used for impersonation
export const SESSION_COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token"

// Stores the admin's original JWT while they are impersonating another user
export const IMPERSONATOR_COOKIE = "okr_impersonator_session"

// Session maxAge in seconds (must match NextAuth default: 30 days)
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60
