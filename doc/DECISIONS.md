[2026-03-14 10:47] Canonical architecture source
Decision:
- Treat `/doc/AGENTS.md` as the canonical architecture and workflow source when other legacy docs conflict.

Rationale:
- `/doc/AGENTS.md` is newer, more complete, and defines the coordinator workflow, task ledger requirements, canonical tech stack, target directory structure, and subagent model.
- Several older docs still reference a legacy layout (`src/`, `pages/`, Next.js 14, `npm`) that conflicts with the current repository instructions.

Impact:
- Foundation work will target Next.js 15 App Router, TypeScript strict mode, Tailwind CSS v3, `pnpm`, Supabase SSR auth helpers, and the directory layout documented in `/doc/AGENTS.md`.
- Legacy docs remain readable for historical context, but they are not authoritative when they disagree with `/doc/AGENTS.md`.

[2026-03-14 10:55] Package manager bootstrap
Decision:
- Use `corepack pnpm` for local install and verification commands in this workspace.

Rationale:
- `pnpm` was not globally available on PATH, but `corepack` successfully provisioned the documented package manager workflow without changing the project requirements.

Impact:
- Current scripts and validation commands were verified with `corepack pnpm`.
- The project still standardizes on `pnpm`; the command prefix simply reflects the local environment.

[2026-03-14 10:55] Multi-tenant practice model
Decision:
- Anchor the MVP on `practices` and `practice_members` instead of flat user-owned tables.

Rationale:
- The PRD must support both independent therapists and multi-user clinics.
- A practice-centered model keeps row-level security consistent across clinical, billing, and messaging tables.
- This avoids a destructive schema rewrite when adding administrators, multiple therapists, or client portal access.

Impact:
- All business tables include `practice_id`.
- RLS policies will key off active `practice_members` rows.
- Client portal access will layer on top of the same tenancy model via `clients.client_user_id`.

[2026-03-14 10:55] Practice owner access bootstrap
Decision:
- Treat `practices.owner_user_id` as an implicit owner role in RLS helper functions, even before a matching `practice_members` row exists.

Rationale:
- Practice creation and first-user onboarding are easier if the owner can create the first membership and seed the workspace without a circular dependency.

Impact:
- The migration helper functions grant owner-level access from the `practices` row itself.
- The application should still create an explicit owner membership row during onboarding for consistency and roster visibility.

[2026-03-14 10:55] Auth interaction model
Decision:
- Use client-side Supabase auth methods for sign in, sign up, and sign out, while enforcing access with server-side route-group redirects.

Rationale:
- This keeps the first auth slice small and reliable without introducing extra server action plumbing.
- Login and signup still use shared Zod schemas for input validation.
- Protected dashboard routing remains server-enforced through `app/(auth)/layout.tsx`, `app/(dashboard)/layout.tsx`, and middleware-based session refresh.

Impact:
- Auth forms live as client components.
- Protected pages still gate on `supabase.auth.getUser()` server-side.
- Future profile onboarding or invitation acceptance can move to server actions without replacing the route protection model.

[2026-03-14 11:28] Supabase CLI execution path
Decision:
- Use `npx supabase` for hosted project linking and migration push in this workspace.

Rationale:
- The Supabase CLI is not globally installed, but `npx` resolves a working CLI version without extra machine setup.

Impact:
- Schema push and future migration operations can run from this repo with `npx supabase ...`.
- Hosted project access still depends on valid Supabase access token and database password.

[2026-03-14 11:45] Practice bootstrap before feature CRUD
Decision:
- Gate client management behind first-workspace creation on the dashboard instead of assuming a practice already exists for every authenticated user.

Rationale:
- The hosted schema is practice-scoped and RLS correctly denies client writes without a `practice_id`.
- New signups currently create only auth and profile records, so the application must bootstrap a practice and owner membership before feature data can be created.

Impact:
- `/dashboard` now creates the first practice workspace when needed.
- `/dashboard/clients` is only usable after workspace bootstrap.
- The same pattern can be reused for later modules that depend on practice context.

[2026-03-14 12:06] Appointment scheduling without schema expansion
Decision:
- Implement the first scheduling slice directly on top of the existing `appointments` table instead of adding recurrence or availability tables now.

Rationale:
- The current schema already supports client-linked appointments, status tracking, timezone, location type, and meeting details.
- A simpler booking workflow gets scheduling live faster and preserves room for later recurrence or therapist availability modeling without blocking the MVP.

Impact:
- `/dashboard/appointments` provides create, update, and delete flows against `appointments`.
- No additional migration was required for this phase.
- Recurring series and availability remain follow-up enhancements rather than core blockers.
