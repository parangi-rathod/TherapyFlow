[2026-03-14 10:47] docs — Added the missing `/doc/TASKS.md` and seeded the project tracking documents with the initial baseline state for this repository.
[2026-03-14 10:55] feat(config) — Added the Phase 0 application scaffold: Next.js 15 app shell, Tailwind and TypeScript config, Supabase client helpers, local Codex agent config, and project skill stubs.
[2026-03-14 10:55] docs(schema) — Expanded `/doc/SCHEMA.md` into the canonical MVP data model for practices, memberships, clients, scheduling, notes, billing, documents, messaging, reminders, and RLS design.
[2026-03-14 10:55] feat(db) — Added `supabase/migrations/20260314110011_initial_mvp_schema.sql` to create the initial MVP schema, profile bootstrap trigger, indexes, and baseline RLS policies.
[2026-03-14 10:55] feat(auth) — Added login and signup flows, shared auth validation schemas, auth-aware route-group layouts, a protected dashboard page, and browser-based sign-out handling.
[2026-03-14 11:28] chore(supabase) — Initialized Supabase CLI config, linked the hosted project, and pushed the initial MVP schema migration to the remote database.
[2026-03-14 11:45] feat(clients) — Added first-workspace bootstrap, client create/update/delete server actions, validation schemas, and the protected `/dashboard/clients` management UI.
[2026-03-14 12:06] feat(appointments) — Added protected `/dashboard/appointments` scheduling UI, appointment create/update/delete server actions, appointment validation schema, and dashboard navigation into the scheduler.
[2026-03-14 12:39] feat(notes) — Added protected `/dashboard/notes` session-note UI, appointment-linked session and note create/update actions, note validation schema, and dashboard navigation into documentation flows.
[2026-03-14 12:39] docs(roadmap) — Expanded the product roadmap in `/doc/PRD.md` and added explicit backlog tasks in `/doc/TASKS.md` for the extended feature set through audit trail and mobile scope.
[2026-03-14 14:01] feat(documents) — Added protected `/dashboard/documents` upload and listing UI, document metadata actions and validation, and storage-backed open/delete flows.
[2026-03-14 14:01] feat(storage) — Added and pushed `supabase/migrations/20260314135536_document_storage.sql` to create the `client-documents` bucket and practice-scoped storage policies.
[2026-03-14 15:02] feat(reminders) — Added protected `/dashboard/reminders` management UI, reminder validation and server actions, and configurable email and SMS reminder timing and message templates.
[2026-03-14 15:02] feat(scheduling) — Synced queued reminders when appointments change so pending reminder timing follows updated appointment schedules and cancelled appointments cancel queued reminders.
[2026-03-14 16:05] feat(treatment-plans) — Added protected `/dashboard/treatment-plans` UI, structured treatment plan editing, goal intervention management, and progress logging workflows.
[2026-03-14 16:05] feat(db) — Added and pushed `supabase/migrations/20260314160500_treatment_plans.sql` to create treatment planning tables, enums, indexes, triggers, and clinical-role RLS policies.
[2026-03-14 16:17] feat(billing) — Added protected `/dashboard/billing` UI, invoice validation and server actions, payment recording and delete flows, and automatic invoice status sync from recorded payments.
[2026-03-14 16:39] feat(intake) — Added protected `/dashboard/intake-forms` UI for intake template creation, request generation, and submission review plus public `/intake/[token]` client completion flow.
[2026-03-14 16:39] feat(db) — Added and pushed `supabase/migrations/20260314165000_intake_forms.sql` to create intake form tables, enums, triggers, RLS policies, and public token RPCs.
[2026-03-14 17:10] feat(reminder-delivery) — Added Resend-backed email delivery helpers, secured reminder processing API, dashboard processing control, and appointment notification email sends.
[2026-03-14 17:10] feat(ui) — Refreshed the dashboard scheduling views with a more healthcare-oriented visual system across reminders, appointments, and global theme styling.
[2026-03-14 17:55] feat(messages) — Added protected `/dashboard/messages` UI, encrypted message storage helpers, message thread server actions, and therapist/client communication logging flows.
[2026-03-14 18:20] feat(time-tracking) — Added protected `/dashboard/time-tracking` UI, time entry validation and server actions, session-linked billable workload logging, and entry delete flows.
[2026-03-14 18:20] feat(db) — Added `supabase/migrations/20260314180500_time_entries.sql` to create `time_entries`, indexes, triggers, and clinical-role RLS policies.
[2026-03-14 18:55] feat(staff) — Added protected `/dashboard/staff` UI, owner/admin staff membership actions, roster profile lookups, role/status management, and removal controls for multi-user practice access.
