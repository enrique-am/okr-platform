/**
 * Default email template content used for seeding and reset-to-default.
 * Plain TS module — no server/client boundary, no Prisma imports.
 */

export const TEMPLATE_DEFAULTS: Record<string, { subject: string; bodyHtml: string }> = {
  WELCOME: {
    subject: "Bienvenido/a a ORC Platform — Grupo AM",
    bodyHtml: `<h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">¡Bienvenido/a a ORC Platform!</h1>
<p style="margin:0 0 16px;font-size:14px;color:#6b7280;line-height:1.7;">
  Hola <strong style="color:#111827;">{{nombre}}</strong>, has sido invitado/a a <strong style="color:#111827;">ORC Platform</strong>, la plataforma de seguimiento de Objetivos y Resultados Clave de <strong style="color:#111827;">Grupo AM</strong>.
</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
  <tr>
    <td style="background-color:#f0fdf4;border-radius:10px;padding:16px;border-left:3px solid #72bf44;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">Tu equipo</p>
      <p style="margin:0;font-size:15px;font-weight:700;color:#15803d;">{{equipo}}</p>
    </td>
  </tr>
</table>
<div style="text-align:center;margin:28px 0 10px;">
  <a href="{{enlace}}" style="display:inline-block;background-color:#72bf44;color:#ffffff;font-weight:600;font-size:14px;padding:13px 36px;border-radius:10px;text-decoration:none;">Iniciar sesión con Google</a>
</div>
<p style="margin:10px 0 0;font-size:12px;color:#9ca3af;text-align:center;">Usa tu cuenta corporativa de Google Workspace.</p>`,
  },
  WEEKLY_REMINDER: {
    subject: "Recordatorio: registra tu avance semanal — {{equipo}}",
    bodyHtml: `<h1 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111827;">¡Hola, {{nombre}}! 👋</h1>
<p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.7;">
  Esta semana aún no has registrado ningún avance en los ORCs de <strong style="color:#111827;">{{equipo}}</strong>. Tómate un momento para actualizar tu progreso y mantener a todos alineados.
</p>
<div style="text-align:center;margin:24px 0 10px;">
  <a href="{{enlace}}" style="display:inline-block;background-color:#72bf44;color:#ffffff;font-weight:600;font-size:14px;padding:13px 36px;border-radius:10px;text-decoration:none;">Registrar avance</a>
</div>
<p style="margin:10px 0 0;font-size:12px;color:#9ca3af;text-align:center;font-style:italic;">"Los pequeños avances constantes construyen los grandes resultados."</p>`,
  },
  DEADLINE_REMINDER: {
    subject: "ORC por vencer pronto — {{equipo}}",
    bodyHtml: `<h1 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111827;">¡Hola, {{nombre}}!</h1>
<p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.7;">
  Uno de los ORCs de <strong style="color:#111827;">{{equipo}}</strong> está próximo a vencer. Es el momento de hacer el último esfuerzo y cerrar fuerte el periodo.
</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
  <tr>
    <td style="background-color:#fff7ed;border-radius:10px;padding:16px;border-left:3px solid #f59e0b;">
      <p style="margin:0;font-size:13px;font-weight:600;color:#92400e;">Avance actual del ORC: <span style="font-size:18px;color:#b45309;">{{progreso}}</span></p>
    </td>
  </tr>
</table>
<div style="text-align:center;margin:24px 0 10px;">
  <a href="{{enlace}}" style="display:inline-block;background-color:#72bf44;color:#ffffff;font-weight:600;font-size:14px;padding:13px 36px;border-radius:10px;text-decoration:none;">Ver ORC del equipo</a>
</div>
<p style="margin:10px 0 0;font-size:12px;color:#9ca3af;text-align:center;font-style:italic;">¡El esfuerzo final de tu equipo hace la diferencia!</p>`,
  },
  URGENT_REMINDER: {
    subject: "⏰ Tu check-in vence hoy — {{equipo}}",
    bodyHtml: `<div style="text-align:center;margin-bottom:20px;">
  <span style="display:inline-block;background-color:#fff7ed;color:#c2410c;border:1px solid #fed7aa;border-radius:8px;padding:6px 16px;font-size:13px;font-weight:700;">⏰ El check-in cierra hoy</span>
</div>
<h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">¡{{nombre}}, no olvides tu check-in!</h1>
<p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.7;">
  Tu check-in semanal vence hoy. Regístralo ahora para mantener el seguimiento de los ORCs de <strong style="color:#111827;">{{equipo}}</strong>.
</p>
<div style="text-align:center;margin:0 0 12px;">
  <a href="{{enlace}}" style="display:inline-block;background-color:#72bf44;color:#ffffff;font-weight:700;font-size:15px;padding:14px 40px;border-radius:10px;text-decoration:none;">Registrar avance ahora →</a>
</div>
<p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">Solo toma unos minutos. ¡Tu equipo cuenta contigo!</p>`,
  },
  WEEKLY_DIGEST: {
    subject: "Digest Ejecutivo Semanal – Grupo AM",
    bodyHtml: `<h1 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111827;">Hola, {{nombre}} — Digest Ejecutivo Semanal</h1>
<p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.7;">
  Aquí tienes el resumen de progreso de todos los equipos de Grupo AM para esta semana.
</p>
<div style="text-align:center;margin:24px 0 10px;">
  <a href="{{enlace}}" style="display:inline-block;background-color:#72bf44;color:#ffffff;font-weight:600;font-size:14px;padding:13px 36px;border-radius:10px;text-decoration:none;">Ver tablero de empresa</a>
</div>`,
  },
  COMPLIANCE_REPORT: {
    subject: "Reporte de cumplimiento semanal — Grupo AM",
    bodyHtml: `<h1 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111827;">Hola, {{nombre}} — Reporte de Cumplimiento</h1>
<p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.7;">
  Resumen de check-ins semanales de todos los equipos de Grupo AM.
</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
  <tr>
    <td style="background-color:#f9fafb;border-radius:10px;padding:16px;text-align:center;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">Tasa de cumplimiento</p>
      <p style="margin:0;font-size:36px;font-weight:800;color:#15803d;">{{progreso}}</p>
    </td>
  </tr>
</table>
<div style="text-align:center;margin:24px 0 10px;">
  <a href="{{enlace}}" style="display:inline-block;background-color:#72bf44;color:#ffffff;font-weight:600;font-size:14px;padding:13px 36px;border-radius:10px;text-decoration:none;">Ver panel de administración</a>
</div>`,
  },
}
