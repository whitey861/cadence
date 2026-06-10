-- Phase 0: explicit foreign keys to profiles so PostgREST can embed
-- display names alongside memberships, assignments, comments and audit entries.
-- profiles.id mirrors auth.users.id one to one, so these are always satisfiable.

alter table public.memberships
  add constraint memberships_user_id_profiles_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade;

alter table public.position_assignments
  add constraint position_assignments_user_id_profiles_fkey
  foreign key (user_id) references public.profiles (id);

alter table public.attachments
  add constraint attachments_uploaded_by_profiles_fkey
  foreign key (uploaded_by) references public.profiles (id);

alter table public.comments
  add constraint comments_author_user_id_profiles_fkey
  foreign key (author_user_id) references public.profiles (id);

alter table public.audit_log
  add constraint audit_log_actor_user_id_profiles_fkey
  foreign key (actor_user_id) references public.profiles (id);
