# TherapyFlow

TherapyFlow is an AI-first practice management platform for therapists and mental health clinics. This repository currently contains the MVP foundation, hosted Supabase integration, authentication, practice bootstrap, client management, and appointment scheduling.

## Current MVP Status

- Next.js 15 App Router application scaffold
- Supabase SSR auth integration
- Hosted Supabase schema and CLI project setup
- Email/password sign up, sign in, and sign out
- First-workspace bootstrap for new therapists
- Client management CRUD under `/dashboard/clients`
- Appointment scheduling CRUD under `/dashboard/appointments`

## Tech Stack

- Next.js 15
- TypeScript 5
- Tailwind CSS v3
- Supabase Auth + Postgres + RLS
- React Hook Form + Zod
- pnpm

## Local Development

Install dependencies:

```powershell
corepack pnpm install
```

Start the dev server:

```powershell
corepack pnpm dev
```

Open `http://localhost:3000`.

## Required Environment Variables

Create `.env.local` with:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

`.env.example` contains the same keys without values.

## Verification Commands

```powershell
corepack pnpm lint
corepack pnpm build
corepack pnpm typecheck
```

## Repository Notes

- Project state and progress live under [`doc/`](./doc)
- Supabase migrations live under [`supabase/migrations/`](./supabase/migrations)
- The initial hosted schema migration is `20260314110011_initial_mvp_schema.sql`

## Next Feature Lane

- Session note creation and viewing flows
