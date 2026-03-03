import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@am.com.mx"
const APP_URL = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000"

// ─── Shared HTML wrapper ──────────────────────────────────────────────────────

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>ORC Platform – Grupo AM</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
    <tr>
      <td style="padding:40px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width:560px;margin:0 auto;">

          <!-- Logo / header -->
          <tr>
            <td style="text-align:center;padding-bottom:24px;">
              <div style="display:inline-block;background-color:#72bf44;width:44px;height:44px;border-radius:12px;text-align:center;line-height:44px;">
                <span style="color:#ffffff;font-weight:700;font-size:22px;line-height:44px;">G</span>
              </div>
              <p style="margin:10px 0 0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:2px;font-weight:600;">Grupo AM &nbsp;·&nbsp; Sistema ORC</p>
            </td>
          </tr>

          <!-- Content card -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;padding:32px 28px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0;text-align:center;">
              <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.7;">
                Este es un mensaje automático del sistema ORC de Grupo AM.<br>
                Uso interno exclusivo para colaboradores. Si no deseas recibir estas notificaciones,<br>
                comunícate con tu administrador.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── Welcome / Invite Email ───────────────────────────────────────────────────

export async function sendWelcomeEmail(
  to: string,
  {
    roleName,
    teamName,
  }: {
    roleName: string
    teamName: string
  }
) {
  const content = `
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">¡Bienvenido/a a ORC Platform!</h1>
    <p style="margin:0 0 16px;font-size:14px;color:#6b7280;line-height:1.7;">
      Has sido invitado/a a <strong style="color:#111827;">ORC Platform</strong>, la plataforma de seguimiento
      de Objetivos y Resultados Clave de <strong style="color:#111827;">Grupo AM</strong>.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
      <tr>
        <td style="background-color:#f9fafb;border-radius:10px;padding:16px;">
          <p style="margin:0 0 10px;font-size:11px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">Tu acceso</p>
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="font-size:13px;color:#6b7280;padding-bottom:6px;">
                <span style="color:#374151;font-weight:600;">Rol:&nbsp;</span>
                <span style="display:inline-block;background-color:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;border-radius:6px;padding:1px 8px;font-size:12px;font-weight:600;">${roleName}</span>
              </td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#6b7280;">
                <span style="color:#374151;font-weight:600;">Equipo:&nbsp;</span>${teamName}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
      <tr>
        <td style="background-color:#f0fdf4;border-radius:10px;padding:16px;border-left:3px solid #72bf44;">
          <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">¿Qué es ORC Platform?</p>
          <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.65;">
            En esta plataforma podrás dar seguimiento al progreso de los objetivos de tu equipo,
            registrar avances periódicos y mantener a todos alineados con las metas de Grupo AM.
          </p>
        </td>
      </tr>
    </table>

    <div style="text-align:center;margin:28px 0 10px;">
      <a href="${APP_URL}/login"
         style="display:inline-block;background-color:#72bf44;color:#ffffff;font-weight:600;font-size:14px;padding:13px 36px;border-radius:10px;text-decoration:none;">
        Iniciar sesión con Google
      </a>
    </div>
    <p style="margin:10px 0 0;font-size:12px;color:#9ca3af;text-align:center;">
      Usa tu cuenta corporativa de Google Workspace.
    </p>
  `

  await resend.emails.send({
    from: FROM,
    to,
    subject: "Bienvenido/a a ORC Platform — Grupo AM",
    html: emailWrapper(content),
  })
}

// Backward-compatible alias used in admin/users/actions.ts
export const sendInviteEmail = sendWelcomeEmail

// ─── Weekly Check-in Reminder ─────────────────────────────────────────────────

interface OrcSummary {
  title: string
  number: number
  progress: number
}

export async function sendWeeklyCheckinReminder(
  to: string,
  {
    name,
    teamName,
    teamSlug,
    orcs,
  }: {
    name?: string | null
    teamName: string
    teamSlug: string
    orcs: OrcSummary[]
  }
) {
  const firstName = name?.split(" ")[0] ?? null
  const checkinUrl = `${APP_URL}/dashboard/teams/${teamSlug}`

  const orcRows = orcs
    .map((orc) => {
      const pct = Math.min(100, Math.round(orc.progress))
      const barColor =
        pct >= 70 ? "#72bf44" : pct >= 60 ? "#f59e0b" : "#ef4444"
      const textColor =
        pct >= 70 ? "#15803d" : pct >= 60 ? "#b45309" : "#b91c1c"
      const statusLabel =
        pct >= 70 ? "En seguimiento" : pct >= 60 ? "En riesgo" : "Retrasado"

      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding-bottom:6px;">
                  <span style="font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">ORC ${orc.number}</span>
                  <span style="font-size:13px;font-weight:600;color:#111827;margin-left:6px;">${orc.title}</span>
                </td>
                <td style="text-align:right;white-space:nowrap;padding-bottom:6px;">
                  <span style="font-size:11px;font-weight:700;color:${textColor};">${statusLabel}</span>
                </td>
              </tr>
              <tr>
                <td colspan="2">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="width:100%;">
                        <div style="background-color:#e5e7eb;border-radius:999px;height:6px;overflow:hidden;">
                          <div style="width:${pct}%;height:6px;background-color:${barColor};border-radius:999px;"></div>
                        </div>
                      </td>
                      <td style="width:36px;text-align:right;padding-left:8px;">
                        <span style="font-size:12px;font-weight:700;color:${textColor};">${pct}%</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
    })
    .join("")

  const content = `
    <h1 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111827;">
      ${firstName ? `¡Hola, ${firstName}! 👋` : "¡Hola, equipo! 👋"}
    </h1>
    <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.7;">
      Esta semana aún no has registrado ningún avance en los ORCs de tu equipo.
      Tómate un momento para actualizar tu progreso y mantener a todos alineados.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
      <tr>
        <td style="background-color:#f9fafb;border-radius:10px;padding:16px 16px 4px;">
          <p style="margin:0 0 12px;font-size:11px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">
            Progreso actual — ${teamName}
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            ${orcRows}
          </table>
        </td>
      </tr>
    </table>

    <div style="text-align:center;margin:24px 0 10px;">
      <a href="${checkinUrl}"
         style="display:inline-block;background-color:#72bf44;color:#ffffff;font-weight:600;font-size:14px;padding:13px 36px;border-radius:10px;text-decoration:none;">
        Registrar avance
      </a>
    </div>
    <p style="margin:10px 0 0;font-size:12px;color:#9ca3af;text-align:center;font-style:italic;">
      "Los pequeños avances constantes construyen los grandes resultados."
    </p>
  `

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Recordatorio: registra tu avance semanal — ${teamName}`,
    html: emailWrapper(content),
  })
}

// ─── ORC Deadline Reminder ────────────────────────────────────────────────────

export async function sendDeadlineReminder(
  to: string,
  {
    name,
    orcTitle,
    orcNumber,
    progress,
    teamName,
    teamSlug,
    daysLeft,
  }: {
    name?: string | null
    orcTitle: string
    orcNumber: number
    progress: number
    teamName: string
    teamSlug: string
    daysLeft: number
  }
) {
  const firstName = name?.split(" ")[0] ?? null
  const teamUrl = `${APP_URL}/dashboard/teams/${teamSlug}`

  const pct = Math.min(100, Math.round(progress))
  const barColor = pct >= 70 ? "#72bf44" : pct >= 60 ? "#f59e0b" : "#ef4444"
  const textColor = pct >= 70 ? "#15803d" : pct >= 60 ? "#b45309" : "#b91c1c"
  const statusLabel = pct >= 70 ? "En seguimiento" : pct >= 60 ? "En riesgo" : "Retrasado"

  const urgencyBg = daysLeft <= 3 ? "#fef2f2" : "#fff7ed"
  const urgencyBorder = daysLeft <= 3 ? "#fecaca" : "#fed7aa"
  const urgencyColor = daysLeft <= 3 ? "#dc2626" : "#d97706"
  const daysLabel = daysLeft === 1 ? "1 día restante" : `${daysLeft} días restantes`

  const content = `
    <h1 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111827;">
      ${firstName ? `¡Hola, ${firstName}!` : "¡Hola, equipo!"}
    </h1>
    <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.7;">
      Uno de los ORCs de tu equipo está próximo a vencer. Es el momento de hacer el último esfuerzo
      y cerrar fuerte el periodo.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
      <tr>
        <td style="border:1px solid #e5e7eb;border-radius:12px;padding:20px;">
          <!-- ORC header row -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;">
            <tr>
              <td style="vertical-align:top;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">ORC ${orcNumber} &nbsp;·&nbsp; ${teamName}</p>
                <p style="margin:0;font-size:15px;font-weight:700;color:#111827;">${orcTitle}</p>
              </td>
              <td style="vertical-align:top;text-align:right;padding-left:12px;white-space:nowrap;">
                <span style="display:inline-block;background-color:${urgencyBg};color:${urgencyColor};border:1px solid ${urgencyBorder};border-radius:8px;padding:4px 10px;font-size:12px;font-weight:700;">
                  ⏰ ${daysLabel}
                </span>
              </td>
            </tr>
          </table>

          <!-- Progress bar -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">
            <tr>
              <td style="width:100%;vertical-align:middle;">
                <div style="background-color:#e5e7eb;border-radius:999px;height:8px;overflow:hidden;">
                  <div style="width:${pct}%;height:8px;background-color:${barColor};border-radius:999px;"></div>
                </div>
              </td>
              <td style="width:48px;text-align:right;padding-left:10px;vertical-align:middle;white-space:nowrap;">
                <span style="font-size:14px;font-weight:700;color:${textColor};">${pct}%</span>
              </td>
            </tr>
          </table>
          <p style="margin:0;font-size:12px;color:${textColor};font-weight:600;">${statusLabel}</p>
        </td>
      </tr>
    </table>

    <div style="text-align:center;margin:24px 0 10px;">
      <a href="${teamUrl}"
         style="display:inline-block;background-color:#72bf44;color:#ffffff;font-weight:600;font-size:14px;padding:13px 36px;border-radius:10px;text-decoration:none;">
        Ver ORC del equipo
      </a>
    </div>
    <p style="margin:10px 0 0;font-size:12px;color:#9ca3af;text-align:center;font-style:italic;">
      ¡El esfuerzo final de tu equipo hace la diferencia!
    </p>
  `

  await resend.emails.send({
    from: FROM,
    to,
    subject: `ORC por vencer en ${daysLabel}: ${orcTitle}`,
    html: emailWrapper(content),
  })
}
