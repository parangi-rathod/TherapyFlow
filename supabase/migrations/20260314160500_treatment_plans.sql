create type public.treatment_plan_status as enum ('draft', 'active', 'completed', 'archived');
create type public.treatment_goal_status as enum ('planned', 'in_progress', 'achieved', 'paused');

create table public.treatment_plans (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  title text not null,
  summary text,
  status public.treatment_plan_status not null default 'draft',
  start_date date not null,
  target_review_date date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.treatment_plan_goals (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  treatment_plan_id uuid not null references public.treatment_plans(id) on delete cascade,
  title text not null,
  description text,
  interventions text[] not null default '{}',
  target_date date,
  status public.treatment_goal_status not null default 'planned',
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  sort_order integer not null default 0,
  last_progress_note text,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.treatment_plan_progress_entries (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  treatment_plan_id uuid not null references public.treatment_plans(id) on delete cascade,
  goal_id uuid not null references public.treatment_plan_goals(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete restrict,
  summary text not null,
  barriers text,
  next_steps text,
  progress_percent integer not null check (progress_percent between 0 and 100),
  status public.treatment_goal_status not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index treatment_plans_practice_client_idx
on public.treatment_plans (practice_id, client_id, created_at desc);

create index treatment_plan_goals_plan_sort_idx
on public.treatment_plan_goals (treatment_plan_id, sort_order);

create index treatment_plan_progress_goal_created_idx
on public.treatment_plan_progress_entries (goal_id, created_at desc);

create trigger treatment_plans_set_updated_at
before update on public.treatment_plans
for each row
execute function public.set_updated_at();

create trigger treatment_plan_goals_set_updated_at
before update on public.treatment_plan_goals
for each row
execute function public.set_updated_at();

alter table public.treatment_plans enable row level security;
alter table public.treatment_plan_goals enable row level security;
alter table public.treatment_plan_progress_entries enable row level security;

create policy "treatment_plans_select_clinical_roles"
on public.treatment_plans
for select
using (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist']::public.practice_role[]
  )
);

create policy "treatment_plans_write_clinical_roles"
on public.treatment_plans
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

create policy "treatment_plan_goals_select_clinical_roles"
on public.treatment_plan_goals
for select
using (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist']::public.practice_role[]
  )
);

create policy "treatment_plan_goals_write_clinical_roles"
on public.treatment_plan_goals
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

create policy "treatment_plan_progress_select_clinical_roles"
on public.treatment_plan_progress_entries
for select
using (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist']::public.practice_role[]
  )
);

create policy "treatment_plan_progress_write_clinical_roles"
on public.treatment_plan_progress_entries
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
