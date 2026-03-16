# TherapyFlow

TherapyFlow is an AI-first practice management platform for therapists and mental health clinics. This repository currently contains the MVP foundation, hosted Supabase integration, authentication, practice bootstrap, client management, appointment scheduling, treatment planning, session notes, document management, reminders, billing, and intake forms.

## Current MVP Status

- Next.js 15 App Router application scaffold
- Supabase SSR auth integration
- Hosted Supabase schema and CLI project setup
- Email/password sign up, sign in, and sign out
- First-workspace bootstrap for new therapists
- Client management CRUD under `/dashboard/clients`
- Appointment scheduling CRUD under `/dashboard/appointments`
- Treatment planning under `/dashboard/treatment-plans`
- Session note CRUD under `/dashboard/notes`
- Secure document management under `/dashboard/documents`
- Appointment reminders under `/dashboard/reminders`
- Provider-backed reminder email delivery via Resend and secured processing API
- Secure therapist-client messaging under `/dashboard/messages`
- Time tracking under `/dashboard/time-tracking`
- Staff management under `/dashboard/staff`
- Billing and payment tracking under `/dashboard/billing`
- Intake form creation and review under `/dashboard/intake-forms`
- Public client intake completion under `/intake/[token]`

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
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
RESEND_REPLY_TO_EMAIL=
REMINDER_PROCESSING_SECRET=
MESSAGE_ENCRYPTION_KEY=
```

Reminder delivery notes:

- `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are required for outbound email delivery.
- `SUPABASE_SERVICE_ROLE_KEY` and `REMINDER_PROCESSING_SECRET` are required for the secured `/api/reminders/process` endpoint.
- `MESSAGE_ENCRYPTION_KEY` is required for encrypted secure message storage.
- Appointment create and update flows now send confirmation/update emails when reminder email config is present.
- Queued reminder emails can be processed from `/dashboard/reminders` or by calling the secured API route from a cron job.

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

- Secure therapist-client messaging flows
