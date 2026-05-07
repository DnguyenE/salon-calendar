-- supabase/migrations/20260505233200_profiles_admin_manage_staff.sql
--
-- Allow admins to update / delete staff profiles within their own organization.

drop policy if exists "profiles_update_staff_by_admin" on public.profiles;
create policy "profiles_update_staff_by_admin"
  on public.profiles
  for update
  using (
    role = 'staff'
    and public.has_role_in_org(array['admin'], profiles.organization_id)
  )
  with check (
    role = 'staff'
    and public.has_role_in_org(array['admin'], profiles.organization_id)
  );

drop policy if exists "profiles_delete_staff_by_admin" on public.profiles;
create policy "profiles_delete_staff_by_admin"
  on public.profiles
  for delete
  using (
    role = 'staff'
    and public.has_role_in_org(array['admin'], profiles.organization_id)
  );
