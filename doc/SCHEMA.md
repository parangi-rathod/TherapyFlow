# SCHEMA

Current status:
- MVP schema design documented.
- Initial migration authored at `supabase/migrations/20260314110011_initial_mvp_schema.sql`.
- Initial migration pushed to the hosted Supabase project `zslqoyqzefbazodkvkmk`.
- The next implementation task is to wire authentication flows against this schema baseline.

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
- `documents.client_id` -> `clients.id`
- `invoices.client_id` -> `clients.id`
- `payments.invoice_id` -> `invoices.id`
- `message_threads.client_id` -> `clients.id`
- `messages.thread_id` -> `message_threads.id`
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

## First migration sequence

1. Create enums.
2. Create `profiles`, `practices`, and `practice_members`.
3. Create `clients`.
4. Create `appointments`, `sessions`, and `notes`.
5. Create `documents`, `invoices`, `payments`, `message_threads`, `messages`, and `reminders`.
6. Add indexes, updated-at triggers, and foreign-key constraints.
7. Enable RLS on every table.
8. Add baseline select and write policies.
