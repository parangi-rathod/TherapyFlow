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

[2026-03-14 12:39] Appointment-linked note workflow
Decision:
- Implement the first session note flow as appointment-linked creation of both `sessions` and `notes` rows.

Rationale:
- The schema already models notes as children of sessions, and sessions can link directly to appointments.
- Using the existing appointment context avoids a new migration while keeping documentation tied to scheduled care.
- This gives the MVP a real clinical record flow instead of storing notes in a detached draft-only model.

Impact:
- `/dashboard/notes` requires at least one appointment before notes can be created.
- Creating a note also creates or updates the associated `sessions` record.
- Free-form ad hoc session notes remain a follow-up enhancement rather than a current blocker.

[2026-03-14 14:01] Practice-scoped storage path design
Decision:
- Store uploaded client documents under `client-documents/<practice_id>/<client_id>/<timestamp>-<filename>` and enforce access through storage policies keyed on the first folder segment.

Rationale:
- The `documents` table is practice-scoped, but Supabase Storage needs an independent security boundary.
- Using `practice_id` as the first path segment lets storage policies map object access back to the existing practice membership helper functions.
- This supports browser-side uploads with the authenticated session while keeping storage access inside the same tenancy model.

Impact:
- Document uploads now depend on migration `20260314135536_document_storage.sql`.
- Browser uploads and signed URL access work through the user session without a service-role proxy.
- Future client portal reads can narrow storage access further using `documents.is_client_visible`.

[2026-03-14 15:02] Appointment-linked reminder queue design
Decision:
- Store reminder message customization, lead time, and resolved delivery target in `reminders.payload`, and recompute queued reminder timing when an appointment is edited.

Rationale:
- The existing `reminders` table already supports channel, scheduled time, and delivery status without a schema migration.
- Lead time in minutes keeps reminder timing configurable while still deriving from the appointment start time.
- Recomputing queued reminders on appointment edits keeps reminders aligned with the live schedule and prevents stale send times.

Impact:
- `/dashboard/reminders` now manages email and SMS reminder timing and message configuration on top of the current schema.
- Updating an appointment reschedules pending reminders and cancels queued reminders if the appointment is cancelled.
- Provider-backed outbound delivery remains a later integration layer on top of the reminder queue.

[2026-03-14 17:10] Resend-backed reminder delivery model
Decision:
- Use Resend for outbound email delivery and expose a secured `/api/reminders/process` endpoint plus a dashboard-triggered processing action.

Rationale:
- The queue-based reminder design already separated scheduling from delivery, so the cleanest next step was attaching a provider to due `pending` email reminders.
- A secured processing endpoint keeps reminder sending compatible with external cron execution without exposing an unauthenticated job surface.
- Keeping appointment confirmation/update emails on the same provider reduces duplicated email integration paths.

Impact:
- Reminder email delivery is now functionally implemented, subject to runtime configuration of `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `SUPABASE_SERVICE_ROLE_KEY`, and `REMINDER_PROCESSING_SECRET`.
- `/dashboard/reminders` can manually process due emails, while `/api/reminders/process` can be used for scheduled automation.
- Reminder failures are written back into `reminders.payload.error` so the UI can surface delivery issues to staff.

[2026-03-14 17:55] Application-layer secure message encryption
Decision:
- Encrypt secure message bodies in the application layer with `MESSAGE_ENCRYPTION_KEY` before storing them in `messages.body_encrypted`, while keeping a short plaintext preview for list surfaces.

Rationale:
- The existing schema already had `body_encrypted`, so application-layer encryption was the fastest way to make the stored payload meaningfully protected without a new database migration.
- Keeping only a short preview in plaintext supports thread scanning in the clinician UI without exposing full message content at rest.
- Logging therapist-authored outbound messages and manually captured client replies closes the workflow gap until client portal authentication exists.

Impact:
- `/dashboard/messages` now requires `MESSAGE_ENCRYPTION_KEY` for full function.
- Full message bodies are decrypted only on the server-rendered page and stored encrypted in the database.
- The current MVP supports therapist-authored messages and staff-logged client replies; direct client-authenticated messaging remains a future portal enhancement.

[2026-03-14 18:20] Session-linked time entry model
Decision:
- Add a dedicated `time_entries` table for practice-scoped workload logging, with optional `session_id` linkage and explicit billable status.

Rationale:
- `sessions.duration_minutes` captures encounter duration, but it is not enough for billing workflow, admin work tracking, or multiple tracked tasks tied to the same client.
- A dedicated table keeps time tracking flexible without overloading note or session records with billing state.
- Computing duration from timestamps in the application layer reduces manual billing math errors and keeps entry data consistent.

Impact:
- `/dashboard/time-tracking` now supports tracked work that can optionally tie back to existing sessions.
- Billable and non-billable work can be separated before invoice creation.
- The new table is protected by the same clinical-role RLS model as sessions and notes.

[2026-03-14 18:55] Existing-user staff onboarding model
Decision:
- Implement staff management on top of the existing `practice_members` table by adding existing TherapyFlow users to a practice roster via their signup email, rather than building full invitation acceptance flow yet.

Rationale:
- The schema and RLS model for `practice_members` already existed, so the fastest useful Phase 3 slice was a real admin roster UI rather than a partial schema expansion.
- Because `profiles` are self-readable under RLS, server-side admin profile lookups are needed to resolve roster names and emails safely for owners/admins.
- Requiring the teammate to sign up first avoids creating orphaned invitation records before invitation tokens and acceptance flows exist.

Impact:
- `/dashboard/staff` now lets owners and admins add, update, and remove staff memberships with `admin`, `therapist`, and `billing` roles.
- Multi-user access is functionally enabled for existing platform users, but email-invite acceptance remains a future enhancement.
- Staff roster rendering depends on `SUPABASE_SERVICE_ROLE_KEY` for server-side profile lookups.

[2026-03-14 16:05] Treatment planning data model
Decision:
- Model treatment planning with three practice-scoped tables: `treatment_plans`, `treatment_plan_goals`, and append-only `treatment_plan_progress_entries`.

Rationale:
- Plans need stable top-level metadata for client ownership, review cadence, and lifecycle status.
- Goals need their own status and progress snapshot so the UI can show live clinical state without replaying a full event log.
- Progress entries preserve an audit-friendly history of clinical updates and next steps without forcing every edit into the main plan form.

Impact:
- `/dashboard/treatment-plans` can separate plan editing from day-to-day progress logging.
- Goal progress is available both as current state and as historical entries.
- Existing goals are preserved during plan edits so progress history remains attached to stable goal rows.

[2026-03-14 16:17] Billing status sync model
Decision:
- Keep billing on the existing `invoices` and `payments` tables, and derive invoice status from recorded payments unless an invoice is explicitly marked `void`.

Rationale:
- The current schema already supports invoice totals, payment records, and RLS for billing roles, so an extra migration would not add meaningful MVP value.
- Deriving `partial` and `paid` from actual payment totals avoids inconsistent manual status edits.
- Preserving `void` as an explicit override allows the billing workflow to cancel an invoice without deleting historical records.

Impact:
- `/dashboard/billing` can stay lightweight while still enforcing balance integrity.
- Recording or deleting a payment automatically resyncs the parent invoice status.
- Billing remains ready for later integrations like Stripe or ACH processing without changing the core bookkeeping model.

[2026-03-14 16:39] Tokenized intake completion flow
Decision:
- Implement intake completion as a public tokenized route backed by security-definer SQL RPCs instead of waiting for full client-portal authentication.

Rationale:
- The backlog requires client completion now, but the client portal and client user accounts are not implemented yet.
- Public RPCs keyed on a hashed request token let the application expose only one specific intake request at a time without introducing a service-role dependency in the app layer.
- This keeps therapist-side intake review inside the existing authenticated dashboard while still giving clients a real completion flow.

Impact:
- `/dashboard/intake-forms` creates forms and request links, while `/intake/[token]` handles public completion.
- Intake requests persist reviewable submission history without enabling broad anonymous table access.
- A future client portal can replace token links without requiring a destructive schema rewrite.
