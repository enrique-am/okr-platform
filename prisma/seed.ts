import { PrismaClient, Role, ObjectiveStatus, TrackingStatus, KeyResultType } from "@prisma/client"

// ─── Help Sections ─────────────────────────────────────────────────────────────

const HELP_SECTIONS = [
  {
    title: "¿Qué son los ORCs?",
    slug: "que-son-los-orcs",
    order: 1,
    content: `<h3>Objetivos y Resultados Clave en Grupo AM</h3>
<p>Los <strong>ORCs</strong> (Objetivos y Resultados Clave) son el marco de trabajo que utilizamos en Grupo AM para definir, comunicar y alcanzar metas de manera alineada en todos los niveles de la organización.</p>

<h4>¿Qué es un Objetivo?</h4>
<p>Un <strong>Objetivo</strong> es una declaración cualitativa y motivadora de lo que queremos lograr. Debe ser ambicioso, claro y orientado al impacto. Por ejemplo: <em>"Convertirnos en el medio digital de referencia en México"</em>.</p>

<h4>¿Qué son los Resultados Clave?</h4>
<p>Los <strong>Resultados Clave (RC)</strong> son métricas cuantificables que nos indican si estamos alcanzando el objetivo. Cada objetivo debe tener entre 2 y 5 RCs. Por ejemplo:</p>
<ul>
  <li>Alcanzar 2.5 millones de visitantes únicos mensuales</li>
  <li>Lograr un tiempo de lectura promedio de 4 minutos</li>
  <li>Publicar 35 artículos por semana</li>
</ul>

<h4>¿Por qué usamos ORCs?</h4>
<ul>
  <li><strong>Alineación:</strong> Todos los equipos trabajan hacia las mismas metas estratégicas</li>
  <li><strong>Transparencia:</strong> El progreso es visible para toda la organización</li>
  <li><strong>Enfoque:</strong> Priorizamos lo que realmente importa</li>
  <li><strong>Aprendizaje:</strong> Los ciclos cortos nos permiten ajustar rápidamente</li>
</ul>

<h4>Ciclos y periodos</h4>
<p>En Grupo AM utilizamos ciclos <strong>trimestrales</strong> para los ORCs de equipo y <strong>anuales</strong> para los ORCs empresariales. Esto nos permite mantener el ritmo sin perder de vista la visión a largo plazo.</p>

<h4>Semáforo de progreso</h4>
<p>El progreso de cada ORC se muestra con un semáforo de tres colores:</p>
<ul>
  <li><span style="color:#15803d;font-weight:600;">Verde (En seguimiento):</span> Avance ≥ 70%</li>
  <li><span style="color:#b45309;font-weight:600;">Amarillo (En riesgo):</span> Avance entre 60% y 69%</li>
  <li><span style="color:#b91c1c;font-weight:600;">Rojo (Retrasado):</span> Avance &lt; 60%</li>
</ul>`,
  },
  {
    title: "Cómo usar esta plataforma",
    slug: "como-usar-esta-plataforma",
    order: 2,
    content: `<h3>Guía de uso por rol</h3>
<p>La plataforma ORC de Grupo AM está diseñada para que cada miembro de la organización pueda contribuir al seguimiento de los objetivos de manera sencilla.</p>

<h4>Para Miembros de equipo</h4>
<ol>
  <li><strong>Accede al dashboard</strong> desde el menú de navegación superior.</li>
  <li><strong>Selecciona tu equipo</strong> para ver los ORCs activos del periodo.</li>
  <li><strong>Registra un avance (check-in)</strong> haciendo clic en el botón "Registrar avance" de cada Resultado Clave. Ingresa el valor actual y una nota explicativa.</li>
  <li>Realiza check-ins <strong>al menos una vez por semana</strong> para mantener el progreso actualizado.</li>
</ol>

<h4>Para Líderes de equipo</h4>
<ol>
  <li><strong>Crea y edita ORCs</strong> para tu equipo desde la vista de equipo.</li>
  <li><strong>Define Resultados Clave</strong> con valores objetivo claros y medibles.</li>
  <li><strong>Asigna fuentes de datos</strong> a cada RC para facilitar el seguimiento.</li>
  <li><strong>Monitorea el progreso</strong> de tu equipo y actúa ante señales de riesgo (semáforo amarillo o rojo).</li>
  <li>Recibe <strong>recordatorios semanales</strong> por correo si no se han registrado avances.</li>
</ol>

<h4>Para Ejecutivos y Administradores</h4>
<ol>
  <li><strong>Vista empresarial:</strong> Accede a "ORCs Empresariales" para ver los objetivos de toda la organización.</li>
  <li><strong>Digest ejecutivo:</strong> Recibirás cada lunes un resumen del progreso de todos los equipos por correo.</li>
  <li><strong>Administración:</strong> Los administradores pueden gestionar usuarios, equipos, notificaciones e importar datos.</li>
</ol>

<h4>Flujo semanal recomendado</h4>
<ul>
  <li><strong>Lunes:</strong> Revisa el digest ejecutivo y planifica la semana</li>
  <li><strong>Miércoles/Jueves:</strong> Registra avances en tus Resultados Clave</li>
  <li><strong>Viernes:</strong> Revisa el semáforo del equipo y ajusta prioridades</li>
</ul>`,
  },
  {
    title: "Preguntas frecuentes",
    slug: "preguntas-frecuentes",
    order: 3,
    content: `<h3>Preguntas frecuentes</h3>

<h4>¿Con qué frecuencia debo registrar avances?</h4>
<p>Recomendamos registrar avances <strong>al menos una vez por semana</strong>. Si no se registra ningún avance en 7 días, el sistema enviará un recordatorio automático por correo. El seguimiento frecuente es clave para detectar riesgos a tiempo.</p>

<h4>¿Qué hago si mi ORC está en rojo?</h4>
<p>Un ORC en rojo no es un fracaso — es una señal de alerta temprana. Si tu ORC tiene menos del 60% de avance, te recomendamos:</p>
<ul>
  <li>Conversar con tu equipo para identificar bloqueos</li>
  <li>Ajustar el plan de acción para el resto del período</li>
  <li>Comunicar la situación a tu líder o al equipo directivo</li>
  <li>Si es necesario, los administradores pueden ajustar el valor objetivo del RC</li>
</ul>

<h4>¿Puedo modificar un Resultado Clave una vez creado?</h4>
<p>Sí, los líderes de equipo y administradores pueden editar los RCs. Sin embargo, se recomienda <strong>no cambiar el valor objetivo a mitad del periodo</strong> sin documentar la razón en una nota de check-in, ya que esto afecta la comparabilidad del progreso histórico.</p>

<h4>¿Cómo se calcula el progreso de un ORC?</h4>
<p>El progreso del ORC es el <strong>promedio del porcentaje de avance de todos sus Resultados Clave</strong>. Para RCs de tipo porcentaje, el avance es directamente el valor actual dividido entre el valor objetivo. Para RCs numéricos o de moneda, se calcula proporcionalmente entre el valor inicial (baseline) y el objetivo.</p>

<h4>¿Puedo ver los ORCs de otros equipos?</h4>
<p>Sí. La <strong>vista empresarial</strong> (ORCs Empresariales) muestra el progreso consolidado de todos los equipos de Grupo AM. Esta transparencia es parte del valor del marco ORC: todos pueden ver cómo contribuye cada equipo a los objetivos de la organización.</p>`,
  },
  {
    title: "Documentos de referencia",
    slug: "documentos-de-referencia",
    order: 4,
    content: `<h3>Documentos de referencia</h3>
<p>En esta sección encontrarás documentos, guías y materiales de apoyo para el trabajo con ORCs en Grupo AM. Los archivos adjuntos pueden descargarse directamente desde esta página.</p>
<p>Si necesitas agregar documentos a esta sección, contacta a un administrador de la plataforma.</p>`,
  },
]

async function seedHelpSections() {
  console.log("  🌱  Seeding help sections...")
  for (const section of HELP_SECTIONS) {
    await prisma.helpSection.upsert({
      where: { slug: section.slug },
      update: {
        title: section.title,
        order: section.order,
        content: section.content,
        isPublished: true,
      },
      create: {
        title: section.title,
        slug: section.slug,
        order: section.order,
        content: section.content,
        isPublished: true,
      },
    })
    console.log(`    ✓  ${section.title}`)
  }
}

const prisma = new PrismaClient()

// ─── Seed data ────────────────────────────────────────────────────────────────
// Mirrors the mock data used during UI development so the visual output matches.
// KR progress is stored as currentValue out of targetValue=100 (percentage).

const SEED_TEAMS = [
  {
    name: "Editorial",
    slug: "editorial",
    lead: { name: "María González", email: "maria.gonzalez@am.com.mx" },
    objectives: [
      {
        title: "Aumentar audiencia digital en 40%",
        trackingStatus: TrackingStatus.ON_TRACK,
        keyResults: [
          { title: "Visitantes únicos mensuales: 2.5M", progress: 80 },
          { title: "Tiempo de lectura promedio: 4 min", progress: 65 },
          { title: "Artículos publicados por semana: 35", progress: 71 },
        ],
      },
      {
        title: "Elevar calidad del contenido editorial",
        trackingStatus: TrackingStatus.AT_RISK,
        keyResults: [
          { title: "NPS de lectores: 72", progress: 50 },
          { title: "Artículos de investigación a fondo: 60%", progress: 40 },
        ],
      },
    ],
  },
  {
    name: "Digital",
    slug: "digital",
    lead: { name: "Carlos Martínez", email: "carlos.martinez@am.com.mx" },
    objectives: [
      {
        title: "Lanzar nueva plataforma de streaming",
        trackingStatus: TrackingStatus.ON_TRACK,
        keyResults: [
          { title: "Beta testing completado: 100%", progress: 100 },
          { title: "Migración de usuarios: 75%", progress: 75 },
          { title: "Uptime del sistema: 99.9%", progress: 80 },
        ],
      },
      {
        title: "Incrementar engagement en redes sociales",
        trackingStatus: TrackingStatus.OFF_TRACK,
        keyResults: [
          { title: "Seguidores en Instagram: 500K", progress: 35 },
          { title: "Tasa de engagement: 5%", progress: 25 },
        ],
      },
    ],
  },
  {
    name: "Comercial",
    slug: "comercial",
    lead: { name: "Ana Reyes", email: "ana.reyes@am.com.mx" },
    objectives: [
      {
        title: "Aumentar ingresos publicitarios 25%",
        trackingStatus: TrackingStatus.AT_RISK,
        keyResults: [
          { title: "Nuevos clientes enterprise: 15", progress: 53 },
          { title: "Renovación de contratos: 85%", progress: 70 },
          { title: "Revenue total: $12M MXN", progress: 58 },
        ],
      },
      {
        title: "Expandir cartera de patrocinadores",
        trackingStatus: TrackingStatus.ON_TRACK,
        keyResults: [
          { title: "Patrocinadores activos: 45", progress: 82 },
          { title: "Contratos firmados Q1: 12", progress: 75 },
        ],
      },
    ],
  },
  {
    name: "Tecnología",
    slug: "tecnologia",
    lead: { name: "Luis Hernández", email: "luis.hernandez@am.com.mx" },
    objectives: [
      {
        title: "Reducir tiempo de carga del sitio a <2s",
        trackingStatus: TrackingStatus.ON_TRACK,
        keyResults: [
          { title: "Optimización de imágenes: 100%", progress: 100 },
          { title: "CDN implementado: 95%", progress: 95 },
          { title: "Score Lighthouse: 90+", progress: 75 },
        ],
      },
      {
        title: "Migrar infraestructura a la nube",
        trackingStatus: TrackingStatus.OFF_TRACK,
        keyResults: [
          { title: "Servicios migrados: 5/25", progress: 20 },
          { title: "Documentación técnica: 40%", progress: 20 },
        ],
      },
    ],
  },
  {
    name: "Marketing",
    slug: "marketing",
    lead: { name: "Sofía López", email: "sofia.lopez@am.com.mx" },
    objectives: [
      {
        title: "Posicionar marca en el mercado nacional",
        trackingStatus: TrackingStatus.ON_TRACK,
        keyResults: [
          { title: "Brand awareness: 45%", progress: 70 },
          { title: "Campañas lanzadas: 8/10", progress: 80 },
          { title: "Impresiones totales: 50M", progress: 45 },
        ],
      },
    ],
  },
  {
    name: "Recursos Humanos",
    slug: "recursos-humanos",
    lead: { name: "Pedro Ramírez", email: "pedro.ramirez@am.com.mx" },
    objectives: [
      {
        title: "Mejorar satisfacción del equipo",
        trackingStatus: TrackingStatus.AT_RISK,
        keyResults: [
          { title: "eNPS: 45", progress: 50 },
          { title: "Capacitaciones completadas: 70%", progress: 65 },
          { title: "Rotación de personal: <8%", progress: 50 },
        ],
      },
      {
        title: "Contratar 20 nuevos talentos",
        trackingStatus: TrackingStatus.ON_TRACK,
        keyResults: [
          { title: "Posiciones cubiertas: 15/20", progress: 75 },
          { title: "Tiempo de contratación: 21 días", progress: 75 },
        ],
      },
    ],
  },
]

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱  Starting seed...")

  for (const seedTeam of SEED_TEAMS) {
    // 1. Upsert the lead user
    const lead = await prisma.user.upsert({
      where: { email: seedTeam.lead.email },
      update: { name: seedTeam.lead.name, role: Role.LEAD },
      create: { name: seedTeam.lead.name, email: seedTeam.lead.email, role: Role.LEAD },
    })

    // 2. Upsert the team
    const team = await prisma.team.upsert({
      where: { slug: seedTeam.slug },
      update: { name: seedTeam.name },
      create: { name: seedTeam.name, slug: seedTeam.slug },
    })

    // 3. Assign lead to team
    await prisma.userTeam.upsert({
      where: { userId_teamId: { userId: lead.id, teamId: team.id } },
      create: { userId: lead.id, teamId: team.id },
      update: {},
    })

    // 4. Clear existing objectives for this team (idempotent re-seed)
    const existingObjectives = await prisma.objective.findMany({
      where: { teamId: team.id },
      select: { id: true },
    })
    if (existingObjectives.length > 0) {
      const objectiveIds = existingObjectives.map((o) => o.id)
      await prisma.checkIn.deleteMany({ where: { keyResult: { objectiveId: { in: objectiveIds } } } })
      await prisma.keyResult.deleteMany({ where: { objectiveId: { in: objectiveIds } } })
      await prisma.objective.deleteMany({ where: { id: { in: objectiveIds } } })
    }

    // 5. Create objectives with key results
    for (const obj of seedTeam.objectives) {
      await prisma.objective.create({
        data: {
          title: obj.title,
          status: ObjectiveStatus.ACTIVE,
          trackingStatus: obj.trackingStatus,
          startDate: new Date("2026-01-01"),
          endDate: new Date("2026-03-31"),
          ownerId: lead.id,
          teamId: team.id,
          keyResults: {
            create: obj.keyResults.map((kr) => ({
              title: kr.title,
              type: KeyResultType.PERCENTAGE,
              targetValue: 100,
              currentValue: kr.progress,
              unit: "%",
            })),
          },
        },
      })
    }

    console.log(`  ✓  ${team.name} — ${seedTeam.objectives.length} objectives`)
  }

  await seedHelpSections()

  console.log("\n✅  Seed complete.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
