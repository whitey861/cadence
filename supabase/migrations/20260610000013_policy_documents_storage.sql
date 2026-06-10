-- Phase 1: private storage bucket for policy body documents.
-- Path convention: {workspace_id}/{policy_id}/{filename}; the first folder
-- segment carries the tenant boundary for the storage policies.

insert into storage.buckets (id, name, public)
values ('policy-documents', 'policy-documents', false)
on conflict (id) do nothing;

create policy policy_documents_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'policy-documents'
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
  );

create policy policy_documents_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'policy-documents'
    and public.has_workspace_role(((storage.foldername(name))[1])::uuid,
          array['admin', 'governance_officer']::public.membership_role[])
  );

create policy policy_documents_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'policy-documents'
    and public.has_workspace_role(((storage.foldername(name))[1])::uuid,
          array['admin', 'governance_officer']::public.membership_role[])
  );

create policy policy_documents_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'policy-documents'
    and public.has_workspace_role(((storage.foldername(name))[1])::uuid,
          array['admin', 'governance_officer']::public.membership_role[])
  );
