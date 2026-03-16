# SCHEMA

Current status:
- MVP schema design documented.
- Initial migration authored at `supabase/migrations/20260314110011_initial_mvp_schema.sql`.
- Initial migration pushed to the hosted Supabase project `zslqoyqzefbazodkvkmk`.
- Storage migration authored at `supabase/migrations/20260314135536_document_storage.sql`.
- The `client-documents` bucket and practice-scoped storage policies are pushed to the hosted Supabase project `zslqoyqzefbazodkvkmk`.
- Automated appointment reminders are implemented against the existing `reminders` table and live on `/dashboard/reminders`.
- Treatment planning is implemented on `/dashboard/treatment-plans` and migration `20260314160500_treatment_plans.sql` is pushed to the hosted Supabase project `zslqoyqzefbazodkvkmk`.
- Basic billing and payment tracking are implemented on `/dashboard/billing` on top of the existing `invoices` and `payments` tables.
- Intake forms are implemented on `/dashboard/intake-forms` plus public `/intake/[token]` completion links, and migration `20260314165000_intake_forms.sql` is pushed to the hosted Supabase project `zslqoyqzefbazodkvkmk`.
- Secure therapist-client messaging is implemented on `/dashboard/messages` with encrypted-at-rest message bodies using the existing `message_threads` and `messages` tables.
- Time tracking is implemented on `/dashboard/time-tracking` with migration `20260314180500_time_entries.sql`.
- Multi-user practice access is implemented on `/dashboard/staff` using the existing `practice_members` table and owner/admin roster management actions.
- The next implementation task is financial reporting dashboards for revenue, balances, and analytics.

## Canonical tenancy model

TherapyFlow uses a practice-centered multi-tenant schema:
- `auth.users` is the identity source managed by Supabase Auth.
- `profiles` stores user-level application metadata.
- `practices` represents a solo practice or clinic workspace.
- `practice_members` controls role-based access to a practice.
- All clinical and billing data is scoped by `practice_id`.

This model supports:
- solo therapists
- group practices
- practice administrators
- future client portal accounts

## Shared conventions

Common column patterns:
- `id uuid primary key default gen_random_uuid()`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()` on mutable tables
- foreign keys use `uuid`
- money values use integer cents, not floats
- editor or AI payloads use `jsonb`

Common enum candidates for the first migration:
- `practice_role`: `owner`, `admin`, `therapist`, `billing`
- `membership_status`: `invited`, `active`, `disabled`
- `client_status`: `lead`, `active`, `inactive`, `discharged`
- `appointment_status`: `scheduled`, `confirmed`, `completed`, `cancelled`, `no_show`
- `session_status`: `draft`, `completed`, `cancelled`
- `note_status`: `draft`, `final`
- `document_type`: `consent_form`, `intake_form`, `assessment`, `report`, `other`
- `intake_form_status`: `draft`, `published`, `archived`
- `intake_field_type`: `short_text`, `long_text`, `email`, `phone`, `date`, `number`, `yes_no`, `single_select`, `multi_select`
- `intake_request_status`: `pending`, `submitted`, `expired`, `cancelled`
- `treatment_plan_status`: `draft`, `active`, `completed`, `archived`
- `treatment_goal_status`: `planned`, `in_progress`, `achieved`, `paused`
- `invoice_status`: `draft`, `sent`, `partial`, `paid`, `void`
- `payment_method`: `cash`, `card`, `ach`, `manual`, `other`
- `reminder_channel`: `email`, `sms`, `in_app`
- `reminder_status`: `pending`, `sent`, `failed`, `cancelled`

## Planned tables

### `profiles`

Purpose:
- Stores app metadata for authenticated users.

Key columns:
- `id uuid references auth.users(id) primary key`
- `email text`
- `full_name text`
- `avatar_url text`
- `phone text`
- `timezone text not null default 'UTC'`
- `onboarding_completed boolean not null default false`

Notes:
- One row per authenticated user.
- Email can be denormalized from `auth.users` for convenience, but `auth.users` remains the source of truth.

### `practices`

Purpose:
- Represents a therapist workspace or clinic account.

Key columns:
- `id uuid primary key`
- `name text not null`
- `slug text not null unique`
- `owner_user_id uuid references auth.users(id) not null`
- `practice_type text not null default 'solo'`
- `timezone text not null default 'UTC'`
- `billing_email text`

Notes:
- The first migration can support a single practice per user while keeping the schema ready for multi-practice membership later.

### `practice_members`

Purpose:
- Defines who can access a practice and with what role.

Key columns:
- `id uuid primary key`
- `practice_id uuid references practices(id) not null`
- `user_id uuid references auth.users(id) not null`
- `role practice_role not null`
- `status membership_status not null default 'invited'`
- `invited_by uuid references auth.users(id)`
- `invited_at timestamptz`
- `accepted_at timestamptz`

Constraints:
- `unique (practice_id, user_id)`

Implementation notes:
- `/dashboard/staff` manages role assignment and membership status on top of this table without a new schema migration.
- The current staff-management flow only adds existing TherapyFlow users by email after they sign up.
- Invitation acceptance links and tokenized onboarding remain a later enhancement beyond the current roster-management slice.

### `clients`

Purpose:
- Stores the clinical and contact profile for each client in a practice.

Key columns:
- `id uuid primary key`
- `practice_id uuid references practices(id) not null`
- `primary_therapist_user_id uuid references auth.users(id)`
- `client_user_id uuid references auth.users(id)`
- `first_name text not null`
- `last_name text not null`
- `date_of_birth date`
- `email text`
- `phone text`
- `emergency_contact_name text`
- `emergency_contact_phone text`
- `emergency_contact_relationship text`
- `therapy_history text`
- `status client_status not null default 'active'`
- `created_by_user_id uuid references auth.users(id) not null`

Notes:
- `client_user_id` stays nullable so the therapist can create a client before the client portal account exists.

### `appointments`

Purpose:
- Calendar scheduling records for upcoming or completed sessions.

Key columns:
- `id uuid primary key`
- `practice_id uuid references practices(id) not null`
- `client_id uuid references clients(id) not null`
- `therapist_user_id uuid references auth.users(id) not null`
- `starts_at timestamptz not null`
- `ends_at timestamptz not null`
- `timezone text not null default 'UTC'`
- `status appointment_status not null default 'scheduled'`
- `location_type text not null default 'in_person'`
- `location_details text`
- `meeting_url text`
- `recurring_series_id uuid`

Indexes:
- `(practice_id, starts_at)`
- `(client_id, starts_at)`
- `(therapist_user_id, starts_at)`

### `sessions`

Purpose:
- Stores the clinical encounter record tied to an appointment or ad hoc session.

Key columns:
- `id uuid primary key`
- `practice_id uuid references practices(id) not null`
- `appointment_id uuid references appointments(id)`
- `client_id uuid references clients(id) not null`
- `therapist_user_id uuid references auth.users(id) not null`
- `started_at timestamptz not null`
- `ended_at timestamptz`
- `duration_minutes integer`
- `status session_status not null default 'draft'`
- `recording_storage_path text`
- `transcript_status text not null default 'not_requested'`

Notes:
- `appointment_id` may be nullable to support manual backfill or off-calendar session capture.

### `notes`

Purpose:
- Structured therapist notes and AI-assisted summaries for a session.

Key columns:
- `id uuid primary key`
- `practice_id uuid references practices(id) not null`
- `session_id uuid references sessions(id) not null`
- `author_user_id uuid references auth.users(id) not null`
- `title text`
- `content jsonb not null default '{}'::jsonb`
- `plain_text text`
- `tags text[] not null default '{}'`
- `ai_summary text`
- `risk_flags jsonb not null default '{}'::jsonb`
- `status note_status not null default 'draft'`
- `finalized_at timestamptz`

Notes:
- `content` is the source of truth for rich-text editor state.
- `plain_text` supports search and future AI ingestion pipelines.

### `treatment_plans`

Purpose:
- Stores the high-level treatment plan for a client within a practice.

Key columns:
- `id uuid primary key`
- `practice_id uuid references practices(id) not null`
- `client_id uuid references clients(id) not null`
- `created_by_user_id uuid references auth.users(id) not null`
- `title text not null`
- `summary text`
- `status treatment_plan_status not null default 'draft'`
- `start_date date not null`
- `target_review_date date`

Notes:
- One client can have multiple plans over time.
- The plan row tracks the current lifecycle while detailed goal work lives in child tables.

### `treatment_plan_goals`

Purpose:
- Stores individual goals, interventions, and current progress state for a treatment plan.

Key columns:
- `id uuid primary key`
- `practice_id uuid references practices(id) not null`
- `treatment_plan_id uuid references treatment_plans(id) not null`
- `title text not null`
- `description text`
- `interventions text[] not null default '{}'`
- `target_date date`
- `status treatment_goal_status not null default 'planned'`
- `progress_percent integer not null default 0`
- `sort_order integer not null default 0`
- `last_progress_note text`
- `last_reviewed_at timestamptz`

Notes:
- `interventions` stores the active intervention list without needing a separate join table for the MVP.
- `progress_percent`, `status`, and `last_progress_note` provide the live goal snapshot used by the UI.

### `treatment_plan_progress_entries`

Purpose:
- Records append-only progress updates against a treatment goal.

Key columns:
- `id uuid primary key`
- `practice_id uuid references practices(id) not null`
- `treatment_plan_id uuid references treatment_plans(id) not null`
- `goal_id uuid references treatment_plan_goals(id) not null`
- `author_user_id uuid references auth.users(id) not null`
- `summary text not null`
- `barriers text`
- `next_steps text`
- `progress_percent integer not null`
- `status treatment_goal_status not null`

Notes:
- Progress entries preserve change history while the goal row tracks the latest state.
- Entries support future audit, reporting, and care-quality workflows.

### `documents`

Purpose:
- Tracks client-facing or internal documents stored in Supabase Storage.

Key columns:
- `id uuid primary key`
- `practice_id uuid references practices(id) not null`
- `client_id uuid references clients(id) not null`
- `uploaded_by_user_id uuid references auth.users(id) not null`
- `title text not null`
- `document_type document_type not null default 'other'`
- `storage_bucket text not null`
- `storage_path text not null`
- `mime_type text`
- `file_size_bytes bigint`
- `is_client_visible boolean not null default false`

Constraints:
- `unique (storage_bucket, storage_path)`

### `intake_forms`

Purpose:
- Stores reusable intake form templates for a practice.

Key columns:
- `id uuid primary key`
- `practice_id uuid references practices(id) not null`
- `created_by_user_id uuid references auth.users(id) not null`
- `title text not null`
- `description text`
- `status intake_form_status not null default 'draft'`
- `welcome_text text`
- `completion_message text`

### `intake_form_fields`

Purpose:
- Stores ordered questions for an intake form template.

Key columns:
- `id uuid primary key`
- `practice_id uuid references practices(id) not null`
- `intake_form_id uuid references intake_forms(id) not null`
- `label text not null`
- `field_type intake_field_type not null`
- `placeholder text`
- `help_text text`
- `option_values text[] not null default '{}'`
- `is_required boolean not null default false`
- `sort_order integer not null default 0`

Notes:
- `option_values` supports single-select and multi-select question types without a separate options table in the MVP.

### `intake_form_requests`

Purpose:
- Issues a client-specific intake request and tracks request lifecycle.

Key columns:
- `id uuid primary key`
- `practice_id uuid references practices(id) not null`
- `intake_form_id uuid references intake_forms(id) not null`
- `client_id uuid references clients(id) not null`
- `created_by_user_id uuid references auth.users(id) not null`
- `request_token_hash text not null unique`
- `request_status intake_request_status not null default 'pending'`
- `expires_at timestamptz`
- `submitted_at timestamptz`
- `submitted_by_name text`
- `submitted_by_email text`

Notes:
- The raw public token is never stored directly; the database keeps only a hash.
- Public request lookup and submission happen through security-definer RPCs keyed by the raw token.

### `intake_form_submissions`

Purpose:
- Stores submitted client responses and therapist review metadata.

Key columns:
- `id uuid primary key`
- `practice_id uuid references practices(id) not null`
- `intake_form_request_id uuid references intake_form_requests(id) not null unique`
- `intake_form_id uuid references intake_forms(id) not null`
- `client_id uuid references clients(id) not null`
- `responses jsonb not null default '{}'::jsonb`
- `submitted_at timestamptz not null`
- `reviewed_at timestamptz`
- `reviewed_by_user_id uuid references auth.users(id)`
- `review_notes text`

### `invoices`

Purpose:
- Represents billable charges for sessions or other therapy services.

Key columns:
- `id uuid primary key`
- `practice_id uuid references practices(id) not null`
- `client_id uuid references clients(id) not null`
- `appointment_id uuid references appointments(id)`
- `session_id uuid references sessions(id)`
- `invoice_number text not null`
- `currency text not null default 'USD'`
- `subtotal_cents integer not null`
- `tax_cents integer not null default 0`
- `total_cents integer not null`
- `status invoice_status not null default 'draft'`
- `issued_at timestamptz`
- `due_at timestamptz`
- `paid_at timestamptz`
- `notes text`
- `created_by_user_id uuid references auth.users(id) not null`

Constraints:
- `unique (practice_id, invoice_number)`

### `payments`

Purpose:
- Records incoming payments linked to invoices.

Key columns:
- `id uuid primary key`
- `practice_id uuid references practices(id) not null`
- `invoice_id uuid references invoices(id) not null`
- `client_id uuid references clients(id) not null`
- `amount_cents integer not null`
- `currency text not null default 'USD'`
- `payment_method payment_method not null`
- `external_reference text`
- `paid_at timestamptz not null`
- `recorded_by_user_id uuid references auth.users(id) not null`

### `message_threads`

Purpose:
- Groups secure therapist-client conversations.

Key columns:
- `id uuid primary key`
- `practice_id uuid references practices(id) not null`
- `client_id uuid references clients(id) not null`
- `therapist_user_id uuid references auth.users(id) not null`
- `subject text`
- `last_message_at timestamptz`

### `messages`

Purpose:
- Stores individual secure messages inside a thread.

Key columns:
- `id uuid primary key`
- `thread_id uuid references message_threads(id) not null`
- `practice_id uuid references practices(id) not null`
- `sender_user_id uuid references auth.users(id)`
- `sender_client_id uuid references clients(id)`
- `body_encrypted text not null`
- `body_preview text`
- `sent_at timestamptz not null default now()`
- `read_at timestamptz`

Constraints:
- Exactly one of `sender_user_id` or `sender_client_id` must be populated.

### `reminders`

Purpose:
- Tracks appointment reminder scheduling and delivery status.

Key columns:
- `id uuid primary key`
- `practice_id uuid references practices(id) not null`
- `appointment_id uuid references appointments(id) not null`
- `channel reminder_channel not null`
- `scheduled_for timestamptz not null`
- `sent_at timestamptz`
- `status reminder_status not null default 'pending'`
- `payload jsonb not null default '{}'::jsonb`

Notes:
- `payload` stores reminder configuration metadata such as message content, lead time in minutes, and the resolved email or phone delivery target.
- Reminder scheduling is derived from the linked appointment start time so pending reminders can be resynced when appointments move.

Messaging implementation notes:
- Full message bodies are encrypted in the application layer before being written to `messages.body_encrypted`.
- `body_preview` stores a short plaintext summary to support clinician thread lists without exposing the full message body.
- The current MVP messaging UI supports therapist-authored outbound messages and manually logged client replies until a future client portal is implemented.

### `time_entries`

Purpose:
- Tracks billable and non-billable clinical work, optionally tied to a session.

Key columns:
- `id uuid primary key`
- `practice_id uuid references practices(id) not null`
- `client_id uuid references clients(id) not null`
- `session_id uuid references sessions(id)`
- `therapist_user_id uuid references auth.users(id) not null`
- `started_at timestamptz not null`
- `ended_at timestamptz not null`
- `duration_minutes integer not null`
- `is_billable boolean not null default true`
- `billing_status text not null default 'unbilled'`
- `notes text`

Notes:
- `billing_status` is constrained to `unbilled`, `ready`, `billed`, or `non_billable`.
- Non-billable entries must use `non_billable`; billable entries cannot use that status.
- Duration is computed in the application layer from start and end timestamps before the row is written.

Billing implementation notes:
- Invoice status is synced from payment totals for non-void invoices: no payments -> `draft` or `sent` depending on `issued_at`, partial payments -> `partial`, fully covered invoices -> `paid`.
- Payment creation validates invoice currency and prevents recording amounts above the outstanding balance.

## Relationships summary

- `profiles.id` -> `auth.users.id`
- `practices.owner_user_id` -> `auth.users.id`
- `practice_members.practice_id` -> `practices.id`
- `practice_members.user_id` -> `auth.users.id`
- `clients.practice_id` -> `practices.id`
- `appointments.client_id` -> `clients.id`
- `appointments.therapist_user_id` -> `auth.users.id`
- `sessions.appointment_id` -> `appointments.id`
- `notes.session_id` -> `sessions.id`
- `intake_form_fields.intake_form_id` -> `intake_forms.id`
- `intake_form_requests.intake_form_id` -> `intake_forms.id`
- `intake_form_requests.client_id` -> `clients.id`
- `intake_form_submissions.intake_form_request_id` -> `intake_form_requests.id`
- `treatment_plans.client_id` -> `clients.id`
- `treatment_plan_goals.treatment_plan_id` -> `treatment_plans.id`
- `treatment_plan_progress_entries.goal_id` -> `treatment_plan_goals.id`
- `documents.client_id` -> `clients.id`
- `invoices.client_id` -> `clients.id`
- `payments.invoice_id` -> `invoices.id`
- `message_threads.client_id` -> `clients.id`
- `messages.thread_id` -> `message_threads.id`
- `time_entries.client_id` -> `clients.id`
- `time_entries.session_id` -> `sessions.id`
- `reminders.appointment_id` -> `appointments.id`

## RLS baseline

General rule:
- Every table enables RLS before any data is inserted.
- Policies use `(select auth.uid())`, not bare `auth.uid()`, for performance consistency.

Baseline policy shape:
- `profiles`: users can read and update only their own profile row.
- `practices`: active practice members can read; owners and admins can update.
- `practice_members`: active members can read the roster for their own practice; owner/admin roles manage invitations.
- Practice-scoped tables: active members of the same `practice_id` can read and mutate rows according to role.
- Client portal access: linked `clients.client_user_id` rows will later get narrow policies for their own appointments, documents, invoices, and messages.

Recommended helper pattern for migration work:
- Use a reusable SQL function or repeated `exists` subquery on `practice_members` to avoid copy-pasting policy mistakes.

## Storage buckets

Planned buckets:
- `client-documents`
- `session-recordings`

Bucket access rules:
- Buckets inherit the same practice membership constraints as the table rows that reference them.
- Client-visible documents require a second check on `documents.is_client_visible`.
- `client-documents` object paths use `practice_id/client_id/<timestamp>-<filename>` so storage policies can enforce practice-level access from the first folder segment.

## First migration sequence

1. Create enums.
2. Create `profiles`, `practices`, and `practice_members`.
3. Create `clients`.
4. Create `appointments`, `sessions`, and `notes`.
5. Create `treatment_plans`, `treatment_plan_goals`, and `treatment_plan_progress_entries`.
6. Create `documents`, `invoices`, `payments`, `message_threads`, `messages`, and `reminders`.
7. Add indexes, updated-at triggers, and foreign-key constraints.
8. Enable RLS on every table.
9. Add baseline select and write policies.
