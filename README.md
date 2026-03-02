# OKR Platform – Grupo AM

Internal OKR (Objectives & Key Results) tracking platform for Grupo AM's 14 teams (~50 users).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 14](https://nextjs.org) (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth | [NextAuth.js v4](https://next-auth.js.org) – Google Workspace SSO |
| ORM | [Prisma](https://www.prisma.io) |
| Database | PostgreSQL (hosted on Railway) |
| AI | [OpenAI SDK](https://github.com/openai/openai-node) |
| Hosting | [Railway](https://railway.app) |

---

## Prerequisites

- Node.js 18+
- npm 9+
- A PostgreSQL database (Railway recommended)
- Google Cloud project with OAuth 2.0 credentials
- Anthropic API key

---

## Getting Started

### 1. Clone the repo

```bash
git clone <repo-url>
cd okr-platform
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in all values:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string from Railway |
| `NEXTAUTH_URL` | App URL (`http://localhost:3000` for local dev) |
| `NEXTAUTH_SECRET` | Random secret — run `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `OPENAI_API_KEY` | OpenAI API key for AI Suggest feature |

### 4. Set up the database

```bash
# Push the schema to your database (dev / first setup)
npm run db:push

# Or run migrations (recommended for production)
npm run db:migrate
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Database Commands

```bash
npm run db:generate   # Regenerate Prisma Client after schema changes
npm run db:push       # Push schema to DB without a migration file (dev only)
npm run db:migrate    # Create and apply a migration
npm run db:studio     # Open Prisma Studio GUI
```

---

## Project Structure

```
okr-platform/
├── app/                        # Next.js App Router
│   ├── api/
│   │   └── auth/[...nextauth]/ # NextAuth route handler
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/                 # Shared React components
├── hooks/                      # Custom React hooks
├── lib/                        # Server-side utilities & singletons
│   ├── openai.ts               # OpenAI client
│   ├── auth.ts                 # NextAuth options & adapter config
│   └── prisma.ts               # Prisma client singleton
├── prisma/
│   └── schema.prisma           # Database schema
├── public/                     # Static assets
├── types/
│   └── index.ts                # Shared TypeScript types & NextAuth augments
├── .env.example                # Environment variable template (committed)
├── .env.local                  # Local secrets (gitignored)
├── next.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

---

## Data Models

```
User         – platform users with roles: EXECUTIVE | LEAD | MEMBER | ADMIN
Team         – organizational teams (14 teams at Grupo AM)
Objective    – top-level goals owned by a user, optionally scoped to a team
KeyResult    – measurable outcomes linked to an Objective
CheckIn      – progress updates recorded against a Key Result
```

NextAuth adapter models (`Account`, `Session`, `VerificationToken`) are also present in the schema.

---

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create an **OAuth 2.0 Client ID** (Web application)
3. Add `http://localhost:3000/api/auth/callback/google` to **Authorized redirect URIs**
4. Copy the Client ID and Secret into `.env.local`
