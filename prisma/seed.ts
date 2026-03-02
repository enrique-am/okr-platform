import { PrismaClient, Role, ObjectiveStatus, TrackingStatus, KeyResultType } from "@prisma/client"

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
    await prisma.user.update({
      where: { id: lead.id },
      data: { teamId: team.id },
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

  console.log("\n✅  Seed complete.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
