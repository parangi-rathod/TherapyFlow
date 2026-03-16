create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  therapist_user_id uuid not null references auth.users(id) on delete restrict,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes > 0),
  is_billable boolean not null default true,
  billing_status text not null default 'unbilled' check (
    billing_status in ('unbilled', 'ready', 'billed', 'non_billable')
  ),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (ended_at > started_at),
  check (
    (is_billable = false and billing_status = 'non_billable')
    or (is_billable = true and billing_status in ('unbilled', 'ready', 'billed'))
  )
);

create index time_entries_practice_started_at_idx
on public.time_entries (practice_id, started_at desc);

create index time_entries_client_started_at_idx
on public.time_entries (client_id, started_at desc);

create index time_entries_session_id_idx
on public.time_entries (session_id);

create trigger time_entries_set_updated_at
before update on public.time_entries
for each row
execute function public.set_updated_at();

alter table public.time_entries enable row level security;

create policy "time_entries_select_clinical_roles"
on public.time_entries
for select
using (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist']::public.practice_role[]
  )
);

create policy "time_entries_write_clinical_roles"
on public.time_entries
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
