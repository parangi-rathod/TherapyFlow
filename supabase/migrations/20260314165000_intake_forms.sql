create type public.intake_form_status as enum ('draft', 'published', 'archived');
create type public.intake_field_type as enum (
  'short_text',
  'long_text',
  'email',
  'phone',
  'date',
  'number',
  'yes_no',
  'single_select',
  'multi_select'
);
create type public.intake_request_status as enum ('pending', 'submitted', 'expired', 'cancelled');

create table public.intake_forms (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  title text not null,
  description text,
  status public.intake_form_status not null default 'draft',
  welcome_text text,
  completion_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.intake_form_fields (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  intake_form_id uuid not null references public.intake_forms(id) on delete cascade,
  label text not null,
  field_type public.intake_field_type not null,
  placeholder text,
  help_text text,
  option_values text[] not null default '{}',
  is_required boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.intake_form_requests (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  intake_form_id uuid not null references public.intake_forms(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  request_token_hash text not null unique,
  request_status public.intake_request_status not null default 'pending',
  expires_at timestamptz,
  submitted_at timestamptz,
  submitted_by_name text,
  submitted_by_email text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.intake_form_submissions (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  intake_form_request_id uuid not null unique references public.intake_form_requests(id) on delete cascade,
  intake_form_id uuid not null references public.intake_forms(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  responses jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz,
  reviewed_by_user_id uuid references auth.users(id) on delete set null,
  review_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index intake_forms_practice_created_idx
on public.intake_forms (practice_id, created_at desc);

create index intake_form_fields_form_sort_idx
on public.intake_form_fields (intake_form_id, sort_order);

create index intake_form_requests_client_status_idx
on public.intake_form_requests (client_id, request_status, created_at desc);

create index intake_form_submissions_form_submitted_idx
on public.intake_form_submissions (intake_form_id, submitted_at desc);

create trigger intake_forms_set_updated_at
before update on public.intake_forms
for each row
execute function public.set_updated_at();

create trigger intake_form_fields_set_updated_at
before update on public.intake_form_fields
for each row
execute function public.set_updated_at();

create trigger intake_form_requests_set_updated_at
before update on public.intake_form_requests
for each row
execute function public.set_updated_at();

create trigger intake_form_submissions_set_updated_at
before update on public.intake_form_submissions
for each row
execute function public.set_updated_at();

alter table public.intake_forms enable row level security;
alter table public.intake_form_fields enable row level security;
alter table public.intake_form_requests enable row level security;
alter table public.intake_form_submissions enable row level security;

create policy "intake_forms_select_clinical_roles"
on public.intake_forms
for select
using (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist']::public.practice_role[]
  )
);

create policy "intake_forms_write_clinical_roles"
on public.intake_forms
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

create policy "intake_form_fields_select_clinical_roles"
on public.intake_form_fields
for select
using (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist']::public.practice_role[]
  )
);

create policy "intake_form_fields_write_clinical_roles"
on public.intake_form_fields
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

create policy "intake_form_requests_select_clinical_roles"
on public.intake_form_requests
for select
using (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist']::public.practice_role[]
  )
);

create policy "intake_form_requests_write_clinical_roles"
on public.intake_form_requests
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

create policy "intake_form_submissions_select_clinical_roles"
on public.intake_form_submissions
for select
using (
  public.has_practice_role(
    practice_id,
    array['owner', 'admin', 'therapist']::public.practice_role[]
  )
);

create policy "intake_form_submissions_write_clinical_roles"
on public.intake_form_submissions
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

create or replace function public.hash_intake_request_token(raw_token text)
returns text
language sql
immutable
set search_path = public
as $$
  select encode(extensions.digest(raw_token, 'sha256'), 'hex');
$$;

create or replace function public.get_public_intake_request(raw_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.intake_form_requests%rowtype;
  form_row public.intake_forms%rowtype;
  practice_row public.practices%rowtype;
  client_row public.clients%rowtype;
  fields_payload jsonb;
begin
  select *
  into request_row
  from public.intake_form_requests request
  where request.request_token_hash = public.hash_intake_request_token(raw_token);

  if not found then
    return null;
  end if;

  if request_row.request_status <> 'pending' then
    return jsonb_build_object(
      'requestStatus', request_row.request_status
    );
  end if;

  if request_row.expires_at is not null and request_row.expires_at < timezone('utc', now()) then
    update public.intake_form_requests
    set request_status = 'expired'
    where id = request_row.id;

    return jsonb_build_object(
      'requestStatus', 'expired'
    );
  end if;

  select *
  into form_row
  from public.intake_forms form
  where form.id = request_row.intake_form_id;

  select *
  into practice_row
  from public.practices practice
  where practice.id = request_row.practice_id;

  select *
  into client_row
  from public.clients client
  where client.id = request_row.client_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', field.id,
        'label', field.label,
        'fieldType', field.field_type,
        'placeholder', field.placeholder,
        'helpText', field.help_text,
        'optionValues', field.option_values,
        'isRequired', field.is_required,
        'sortOrder', field.sort_order
      )
      order by field.sort_order asc, field.created_at asc
    ),
    '[]'::jsonb
  )
  into fields_payload
  from public.intake_form_fields field
  where field.intake_form_id = form_row.id;

  return jsonb_build_object(
    'requestId', request_row.id,
    'requestStatus', request_row.request_status,
    'expiresAt', request_row.expires_at,
    'practiceName', practice_row.name,
    'clientName', trim(concat(client_row.first_name, ' ', client_row.last_name)),
    'title', form_row.title,
    'description', form_row.description,
    'welcomeText', form_row.welcome_text,
    'completionMessage', form_row.completion_message,
    'fields', fields_payload
  );
end;
$$;

create or replace function public.submit_public_intake_request(
  raw_token text,
  submitter_name text,
  submitter_email text,
  response_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.intake_form_requests%rowtype;
  submission_id uuid;
begin
  select *
  into request_row
  from public.intake_form_requests request
  where request.request_token_hash = public.hash_intake_request_token(raw_token);

  if not found then
    raise exception 'Invalid intake request token.';
  end if;

  if request_row.request_status <> 'pending' then
    raise exception 'This intake request is no longer accepting responses.';
  end if;

  if request_row.expires_at is not null and request_row.expires_at < timezone('utc', now()) then
    update public.intake_form_requests
    set request_status = 'expired'
    where id = request_row.id;

    raise exception 'This intake request has expired.';
  end if;

  insert into public.intake_form_submissions (
    practice_id,
    intake_form_request_id,
    intake_form_id,
    client_id,
    responses,
    submitted_at
  )
  values (
    request_row.practice_id,
    request_row.id,
    request_row.intake_form_id,
    request_row.client_id,
    coalesce(response_payload, '{}'::jsonb),
    timezone('utc', now())
  )
  returning id into submission_id;

  update public.intake_form_requests
  set
    request_status = 'submitted',
    submitted_at = timezone('utc', now()),
    submitted_by_name = nullif(trim(submitter_name), ''),
    submitted_by_email = nullif(trim(submitter_email), '')
  where id = request_row.id;

  return submission_id;
end;
$$;

grant execute on function public.get_public_intake_request(text) to anon, authenticated;
grant execute on function public.submit_public_intake_request(text, text, text, jsonb) to anon, authenticated;
