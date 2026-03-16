insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit
)
values (
  'client-documents',
  'client-documents',
  false,
  52428800
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "client_documents_select_practice_roles" on storage.objects;
drop policy if exists "client_documents_insert_practice_roles" on storage.objects;
drop policy if exists "client_documents_update_practice_roles" on storage.objects;
drop policy if exists "client_documents_delete_practice_roles" on storage.objects;

create policy "client_documents_select_practice_roles"
on storage.objects
for select
using (
  bucket_id = 'client-documents'
  and array_length(storage.foldername(name), 1) >= 1
  and public.has_practice_role(
    (storage.foldername(name))[1]::uuid,
    array['owner', 'admin', 'therapist']::public.practice_role[]
  )
);

create policy "client_documents_insert_practice_roles"
on storage.objects
for insert
with check (
  bucket_id = 'client-documents'
  and array_length(storage.foldername(name), 1) >= 1
  and public.has_practice_role(
    (storage.foldername(name))[1]::uuid,
    array['owner', 'admin', 'therapist']::public.practice_role[]
  )
);

create policy "client_documents_update_practice_roles"
on storage.objects
for update
using (
  bucket_id = 'client-documents'
  and array_length(storage.foldername(name), 1) >= 1
  and public.has_practice_role(
    (storage.foldername(name))[1]::uuid,
    array['owner', 'admin', 'therapist']::public.practice_role[]
  )
)
with check (
  bucket_id = 'client-documents'
  and array_length(storage.foldername(name), 1) >= 1
  and public.has_practice_role(
    (storage.foldername(name))[1]::uuid,
    array['owner', 'admin', 'therapist']::public.practice_role[]
  )
);

create policy "client_documents_delete_practice_roles"
on storage.objects
for delete
using (
  bucket_id = 'client-documents'
  and array_length(storage.foldername(name), 1) >= 1
  and public.has_practice_role(
    (storage.foldername(name))[1]::uuid,
    array['owner', 'admin', 'therapist']::public.practice_role[]
  )
);
