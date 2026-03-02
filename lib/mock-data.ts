// ─── Types ────────────────────────────────────────────────────────────────────

export type OKRStatus = "on_track" | "at_risk" | "off_track"

export interface KeyResult {
  id: string
  title: string
  progress: number
}

export interface Objective {
  id: string
  title: string
  progress: number
  status: OKRStatus
  keyResults: KeyResult[]
}

export interface TeamData {
  id: string
  name: string
  lead: string
  objectives: Objective[]
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
// Replace this with real Prisma queries in the next iteration.

export const MOCK_TEAMS: TeamData[] = [
  {
    id: "t1",
    name: "Editorial",
    lead: "María González",
    objectives: [
      {
        id: "o1",
        title: "Aumentar audiencia digital en 40%",
        progress: 72,
        status: "on_track",
        keyResults: [
          { id: "kr1", title: "Visitantes únicos mensuales: 2.5M", progress: 80 },
          { id: "kr2", title: "Tiempo de lectura promedio: 4 min", progress: 65 },
          { id: "kr3", title: "Artículos publicados por semana: 35", progress: 71 },
        ],
      },
      {
        id: "o2",
        title: "Elevar calidad del contenido editorial",
        progress: 45,
        status: "at_risk",
        keyResults: [
          { id: "kr4", title: "NPS de lectores: 72", progress: 50 },
          { id: "kr5", title: "Artículos de investigación a fondo: 60%", progress: 40 },
        ],
      },
    ],
  },
  {
    id: "t2",
    name: "Digital",
    lead: "Carlos Martínez",
    objectives: [
      {
        id: "o3",
        title: "Lanzar nueva plataforma de streaming",
        progress: 85,
        status: "on_track",
        keyResults: [
          { id: "kr6", title: "Beta testing completado: 100%", progress: 100 },
          { id: "kr7", title: "Migración de usuarios: 75%", progress: 75 },
          { id: "kr8", title: "Uptime del sistema: 99.9%", progress: 80 },
        ],
      },
      {
        id: "o4",
        title: "Incrementar engagement en redes sociales",
        progress: 30,
        status: "off_track",
        keyResults: [
          { id: "kr9", title: "Seguidores en Instagram: 500K", progress: 35 },
          { id: "kr10", title: "Tasa de engagement: 5%", progress: 25 },
        ],
      },
    ],
  },
  {
    id: "t3",
    name: "Comercial",
    lead: "Ana Reyes",
    objectives: [
      {
        id: "o5",
        title: "Aumentar ingresos publicitarios 25%",
        progress: 60,
        status: "at_risk",
        keyResults: [
          { id: "kr11", title: "Nuevos clientes enterprise: 15", progress: 53 },
          { id: "kr12", title: "Renovación de contratos: 85%", progress: 70 },
          { id: "kr13", title: "Revenue total: $12M MXN", progress: 58 },
        ],
      },
      {
        id: "o6",
        title: "Expandir cartera de patrocinadores",
        progress: 78,
        status: "on_track",
        keyResults: [
          { id: "kr14", title: "Patrocinadores activos: 45", progress: 82 },
          { id: "kr15", title: "Contratos firmados Q1: 12", progress: 75 },
        ],
      },
    ],
  },
  {
    id: "t4",
    name: "Tecnología",
    lead: "Luis Hernández",
    objectives: [
      {
        id: "o7",
        title: "Reducir tiempo de carga del sitio a <2s",
        progress: 90,
        status: "on_track",
        keyResults: [
          { id: "kr16", title: "Optimización de imágenes: 100%", progress: 100 },
          { id: "kr17", title: "CDN implementado: 95%", progress: 95 },
          { id: "kr18", title: "Score Lighthouse: 90+", progress: 75 },
        ],
      },
      {
        id: "o8",
        title: "Migrar infraestructura a la nube",
        progress: 20,
        status: "off_track",
        keyResults: [
          { id: "kr19", title: "Servicios migrados: 5/25", progress: 20 },
          { id: "kr20", title: "Documentación técnica: 40%", progress: 40 },
        ],
      },
    ],
  },
  {
    id: "t5",
    name: "Marketing",
    lead: "Sofía López",
    objectives: [
      {
        id: "o9",
        title: "Posicionar marca en el mercado nacional",
        progress: 65,
        status: "on_track",
        keyResults: [
          { id: "kr21", title: "Brand awareness: 45%", progress: 70 },
          { id: "kr22", title: "Campañas lanzadas: 8/10", progress: 80 },
          { id: "kr23", title: "Impresiones totales: 50M", progress: 45 },
        ],
      },
    ],
  },
  {
    id: "t6",
    name: "Recursos Humanos",
    lead: "Pedro Ramírez",
    objectives: [
      {
        id: "o10",
        title: "Mejorar satisfacción del equipo",
        progress: 55,
        status: "at_risk",
        keyResults: [
          { id: "kr24", title: "eNPS: 45", progress: 50 },
          { id: "kr25", title: "Capacitaciones completadas: 70%", progress: 65 },
          { id: "kr26", title: "Rotación de personal: <8%", progress: 50 },
        ],
      },
      {
        id: "o11",
        title: "Contratar 20 nuevos talentos",
        progress: 75,
        status: "on_track",
        keyResults: [
          { id: "kr27", title: "Posiciones cubiertas: 15/20", progress: 75 },
          { id: "kr28", title: "Tiempo de contratación: 21 días", progress: 80 },
        ],
      },
    ],
  },
]
