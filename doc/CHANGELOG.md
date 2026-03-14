[2026-03-14 10:47] docs — Added the missing `/doc/TASKS.md` and seeded the project tracking documents with the initial baseline state for this repository.
[2026-03-14 10:55] feat(config) — Added the Phase 0 application scaffold: Next.js 15 app shell, Tailwind and TypeScript config, Supabase client helpers, local Codex agent config, and project skill stubs.
[2026-03-14 10:55] docs(schema) — Expanded `/doc/SCHEMA.md` into the canonical MVP data model for practices, memberships, clients, scheduling, notes, billing, documents, messaging, reminders, and RLS design.
[2026-03-14 10:55] feat(db) — Added `supabase/migrations/20260314110011_initial_mvp_schema.sql` to create the initial MVP schema, profile bootstrap trigger, indexes, and baseline RLS policies.
[2026-03-14 10:55] feat(auth) — Added login and signup flows, shared auth validation schemas, auth-aware route-group layouts, a protected dashboard page, and browser-based sign-out handling.
[2026-03-14 11:28] chore(supabase) — Initialized Supabase CLI config, linked the hosted project, and pushed the initial MVP schema migration to the remote database.
[2026-03-14 11:45] feat(clients) — Added first-workspace bootstrap, client create/update/delete server actions, validation schemas, and the protected `/dashboard/clients` management UI.
[2026-03-14 12:06] feat(appointments) — Added protected `/dashboard/appointments` scheduling UI, appointment create/update/delete server actions, appointment validation schema, and dashboard navigation into the scheduler.
