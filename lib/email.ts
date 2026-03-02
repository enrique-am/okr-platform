import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT || 587) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendInviteEmail(
  to: string,
  { roleName, teamName }: { roleName: string; teamName: string }
) {
  const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: "Te han invitado a la plataforma OKR — Grupo AM",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; width: 40px; height: 40px; border-radius: 10px; background-color: #72bf44; color: white; font-weight: bold; font-size: 18px; line-height: 40px;">G</div>
          <p style="margin: 8px 0 0; font-size: 14px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">OKR Platform</p>
        </div>
        <div style="background: #ffffff; border: 1px solid #f3f4f6; border-radius: 16px; padding: 32px 24px;">
          <h1 style="font-size: 18px; color: #111827; margin: 0 0 8px;">¡Hola!</h1>
          <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
            Has sido invitado/a a la plataforma de OKRs de Grupo AM con el rol de
            <strong style="color: #111827;">${roleName}</strong>
            en el equipo <strong style="color: #111827;">${teamName}</strong>.
          </p>
          <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
            Haz clic en el botón de abajo para iniciar sesión con tu cuenta de Google Workspace.
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${appUrl}/login" style="display: inline-block; background-color: #72bf44; color: white; font-weight: 600; font-size: 14px; padding: 12px 32px; border-radius: 8px; text-decoration: none;">
              Iniciar sesión
            </a>
          </div>
        </div>
        <p style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 24px;">
          Uso interno exclusivo para colaboradores de Grupo AM.
        </p>
      </div>
    `,
  })
}
