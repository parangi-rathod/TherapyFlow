create extension if not exists pgcrypto;

create type public.practice_role as enum ('owner', 'admin', 'therapist', 'billing');
create type public.membership_status as enum ('invited', 'active', 'disabled');
create type public.client_status as enum ('lead', 'active', 'inactive', 'discharged');
create type public.appointment_status as enum ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show');
create type public.session_status as enum ('draft', 'completed', 'cancelled');
create type public.note_status as enum ('draft', 'final');
create type public.document_type as enum ('consent_form', 'intake_form', 'assessment', 'report', 'other');
create type public.invoice_status as enum ('draft', 'sent', 'partial', 'paid', 'void');
create type public.payment_method as enum ('cash', 'card', 'ach', 'manual', 'other');
create type public.reminder_channel as enum ('email', 'sms', 'in_app');
create type public.reminder_status as enum ('pending', 'sent', 'failed', 'cancelled');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  avatar_url text,
  phone text,
  timezone text not null default 'UTC',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.practices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  practice_type text not null default 'solo' check (practice_type in ('solo', 'clinic')),
  timezone text not null default 'UTC',
  billing_email text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.practice_members (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.practice_role not null,
  status public.membership_status not null default 'invited',
  invited_by uuid references auth.users(id) on delete set null,
  invited_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (practice_id, user_id)
);

create or replace function public.is_practice_member(target_practice_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.practices practice
    where practice.id = target_practice_id
      and practice.owner_user_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.practice_members practice_member
    where practice_member.practice_id = target_practice_id
      and practice_member.user_id = (select auth.uid())
      and practice_member.status = 'active'
  );
$$;

create or replace function public.has_practice_role(
  target_practice_id uuid,
  allowed_roles public.practice_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
    'owner' = any(allowed_roles)
    and exists (
      select 1
      from public.practices practice
      where practice.id = target_practice_id
        and practice.owner_user_id = (select auth.uid())
    )
  )
  or exists (
    select 1
    from public.practice_members practice_member
    where practice_member.practice_id = target_practice_id
      and practice_member.user_id = (select auth.uid())
      and practice_member.status = 'active'
      and practice_member.role = any(allowed_roles)
  );
$$;

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  primary_therapist_user_id uuid references auth.users(id) on delete set null,
  client_user_id uuid unique references auth.users(id) on delete set null,
  first_name text not null,
  last_name text not null,
  date_of_birth date,
  email text,
  phone text,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,
  therapy_history text,
  status public.client_status not null default 'active',
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  therapist_user_id uuid not null references auth.users(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'UTC',
  status public.appointment_status not null default 'scheduled',
  location_type text not null default 'in_person' check (location_type in ('in_person', 'virtual', 'phone')),
  location_details text,
  meeting_url text,
  recurring_series_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (ends_at > starts_at)
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  appointment_id uuid unique references public.appointments(id) on delete set null,
  client_id uuid not null references public.clients(id) on delete cascade,
  therapist_user_id uuid not null references auth.users(id) on delete restrict,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  status public.session_status not null default 'draft',
  recording_storage_path text,
  transcript_status text not null default 'not_requested',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (ended_at is null or ended_at >= started_at)
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete restrict,
  title text,
  content jsonb not null default '{}'::jsonb,
  plain_text text,
  tags text[] not null default '{}',
  ai_summary text,
  risk_flags jsonb not null default '{}'::jsonb,
  status public.note_status not null default 'draft',
  finalized_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  uploaded_by_user_id uuid not null references auth.users(id) on delete restrict,
  title text not null,
  document_type public.document_type not null default 'other',
  storage_bucket text not null,
  storage_path text not null,
  mime_type text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  is_client_visible boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (storage_bucket, storage_path)
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,
  invoice_number text not null,
  currency text not null default 'USD',
  subtotal_cents integer not null check (subtotal_cents >= 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  total_cents integer generated always as (subtotal_cents + tax_cents) stored,
  status public.invoice_status not null default 'draft',
  issued_at timestamptz,
  due_at timestamptz,
  paid_at timestamptz,
  notes text,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (practice_id, invoice_number)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'USD',
  payment_method public.payment_method not null,
  external_reference text,
  paid_at timestamptz not null,
  recorded_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.message_threads (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  therapist_user_id uuid not null references auth.users(id) on delete restrict,
  subject text,
  last_message_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.message_threads(id) on delete cascade,
  practice_id uuid not null references public.practices(id) on delete cascade,
  sender_user_id uuid references auth.users(id) on delete set null,
  sender_client_id uuid references public.clients(id) on delete set null,
  body_encrypted text not null,
  body_preview text,
  sent_at timestamptz not null default timezone('utc', now()),
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (num_nonnulls(sender_user_id, sender_client_id) = 1)
);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  channel public.reminder_channel not null,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  status public.reminder_status not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index practices_owner_user_id_idx on public.practices (owner_user_id);
create index practice_members_practice_id_idx on public.practice_members (practice_id);
create index practice_members_user_id_idx on public.practice_members (user_id);
create index clients_practice_id_idx on public.clients (practice_id);
create index clients_primary_therapist_idx on public.clients (primary_therapist_user_id);
create index appointments_practice_starts_at_idx on public.appointments (practice_id, starts_at);
create index appointments_client_starts_at_idx on public.appointments (client_id, starts_at);
create index appointments_therapist_starts_at_idx on public.appointments (therapist_user_id, starts_at);
create index sessions_practice_started_at_idx on public.sessions (practice_id, started_at);
create index notes_session_id_idx on public.notes (session_id);
create index documents_client_id_idx on public.documents (client_id);
create index invoices_client_id_idx on public.invoices (client_id);
create index payments_invoice_id_idx on public.payments (invoice_id);
create index message_threads_client_id_idx on public.message_threads (client_id);
create index messages_thread_sent_at_idx on public.messages (thread_id, sent_at desc);
create index reminders_appointment_id_idx on public.reminders (appointment_id);

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger practices_set_updated_at
before update on public.practices
for each row
execute function public.set_updated_at();

create trigger practice_members_set_updated_at
before update on public.practice_members
for each row
execute function public.set_updated_at();

create trigger clients_set_updated_at
before update on public.clients
for each row
execute function public.set_updated_at();

create trigger appointments_set_updated_at
before update on public.appointments
for each row
execute function public.set_updated_at();

create trigger sessions_set_updated_at
before update on public.sessions
for each row
execute function public.set_updated_at();

create trigger notes_set_updated_at
before update on public.notes
for each row
execute function public.set_updated_at();

create trigger documents_set_updated_at
before update on public.documents
for each row
execute function public.set_updated_at();

create trigger invoices_set_updated_at
before update on public.invoices
for each row
execute function public.set_updated_at();

create trigger payments_set_updated_at
before update on public.payments
for each row
execute function public.set_updated_at();

create trigger message_threads_set_updated_at
before update on public.message_threads
for each row
execute function public.set_updated_at();

create trigger messages_set_updated_at
before update on public.messages
for each row
execute function public.set_updated_at();

create trigger reminders_set_updated_at
before update on public.reminders
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.practices enable row level security;
alter table public.practice_members enable row level security;
alter table public.clients enable row level security;
alter table public.appointments enable row level security;
alter table public.sessions enable row level security;
alter table public.notes enable row level security;
alter table public.documents enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.message_threads enable row level security;
alter table public.messages enable row level security;
alter table public.reminders enable row level security;

create policy "profiles_select_self"
on public.profiles
for select
using (id = (select auth.uid()));

create policy "profiles_insert_self"
on public.profiles
for insert
with check (id = (select auth.uid()));

create policy "profiles_update_self"
on public.profiles
for update
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "practices_select_member"
on public.practices
for select
using (
  owner_user_id = (select auth.uid())
  or public.is_practice_member(id)
);

create policy "practices_insert_owner"
on public.practices
for insert
with check (owner_user_id = (select auth.uid()));

create policy "practices_update_admin"
on public.practices
for update
using (
  owner_user_id = (select auth.uid())
  or public.has_practice_role(id, array['owner', 'admin']::public.practice_role[])
)
with check (
  owner_user_id = (select auth.uid())
  or public.has_practice_role(id, array['owner', 'admin']::public.practice_role[])
);

create policy "practice_members_select_visible"
on public.practice_members
for select
using (
  user_id = (select auth.uid())
  or public.is_practice_member(practice_id)
);

create policy "practice_members_insert_admin"
on public.practice_members
for insert
with check (
  exists (
    select 1
    from public.practices practice
    where practice.id = practice_id
      and practice.owner_user_id = (select auth.uid())
  )
  or public.has_practice_role(practice_id, array['owner', 'admin']::public.practice_role[])
);

create policy "practice_members_update_admin"
on public.practice_members
for update
using (
  exists (
    select 1
    from public.practices practice
    where practice.id = practice_id
      and practice.owner_user_id = (select auth.uid())
  )
  or public.has_practice_role(practice_id, array['owner', 'admin']::public.practice_role[])
)
with check (
  exists (
    select 1
    from public.practices practice
    where practice.id = practice_id
      and practice.owner_user_id = (select auth.uid())
  )
  or public.has_practice_role(practice_id, array['owner', 'admin']::public.practice_role[])
);

create policy "practice_members_delete_admin"
on public.practice_members
for delete
using (
  exists (
    select 1
    from public.practices practice
    where practice.id = practice_id
      and practice.owner_user_id = (select auth.uid())
  )
  or public.has_practice_role(practice_id, array['owner', 'admin']::public.practice_role[])
);

create policy "clients_select_practice_roles"
on public.clients
for select
using (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist', 'billing']::public.practice_role[]
  )
);

create policy "clients_insert_clinical_roles"
on public.clients
for insert
with check (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist']::public.practice_role[]
  )
);

create policy "clients_update_clinical_roles"
on public.clients
for update
using (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist']::public.practice_role[]
  )
)
with check (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist']::public.practice_role[]
  )
);

create policy "appointments_select_clinical_roles"
on public.appointments
for select
using (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist']::public.practice_role[]
  )
);

create policy "appointments_write_clinical_roles"
on public.appointments
for all
using (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist']::public.practice_role[]
  )
)
with check (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist']::public.practice_role[]
  )
);

create policy "sessions_select_clinical_roles"
on public.sessions
for select
using (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist']::public.practice_role[]
  )
);

create policy "sessions_write_clinical_roles"
on public.sessions
for all
using (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist']::public.practice_role[]
  )
)
with check (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist']::public.practice_role[]
  )
);

create policy "notes_select_clinical_roles"
on public.notes
for select
using (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist']::public.practice_role[]
  )
);

create policy "notes_write_clinical_roles"
on public.notes
for all
using (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist']::public.practice_role[]
  )
)
with check (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist']::public.practice_role[]
  )
);

create policy "documents_select_clinical_roles"
on public.documents
for select
using (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist']::public.practice_role[]
  )
);

create policy "documents_write_clinical_roles"
on public.documents
for all
using (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist']::public.practice_role[]
  )
)
with check (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist']::public.practice_role[]
  )
);

create policy "invoices_select_billing_roles"
on public.invoices
for select
using (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist', 'billing']::public.practice_role[]
  )
);

create policy "invoices_write_billing_roles"
on public.invoices
for all
using (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist', 'billing']::public.practice_role[]
  )
)
with check (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist', 'billing']::public.practice_role[]
  )
);

create policy "payments_select_billing_roles"
on public.payments
for select
using (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist', 'billing']::public.practice_role[]
  )
);

create policy "payments_write_billing_roles"
on public.payments
for all
using (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist', 'billing']::public.practice_role[]
  )
)
with check (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist', 'billing']::public.practice_role[]
  )
);

create policy "message_threads_select_clinical_roles"
on public.message_threads
for select
using (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist']::public.practice_role[]
  )
);

create policy "message_threads_write_clinical_roles"
on public.message_threads
for all
using (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist']::public.practice_role[]
  )
)
with check (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist']::public.practice_role[]
  )
);

create policy "messages_select_clinical_roles"
on public.messages
for select
using (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist']::public.practice_role[]
  )
);

create policy "messages_write_clinical_roles"
on public.messages
for all
using (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist']::public.practice_role[]
  )
)
with check (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist']::public.practice_role[]
  )
);

create policy "reminders_select_clinical_roles"
on public.reminders
for select
using (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist']::public.practice_role[]
  )
);

create policy "reminders_write_clinical_roles"
on public.reminders
for all
using (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist']::public.practice_role[]
  )
)
with check (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist']::public.practice_role[]
  )
);
