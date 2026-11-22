create or replace function public.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
$$;

create or replace function public.current_role_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.role_id from public.profiles p where p.id = auth.uid()
$$;

revoke execute on function public.is_active_member() from public, anon;
revoke execute on function public.current_role_id() from public, anon;
grant execute on function public.is_active_member() to authenticated, service_role;
grant execute on function public.current_role_id() to authenticated, service_role;

-- Roles / permissions
drop policy if exists roles_read on public.roles;
create policy roles_read on public.roles for select to authenticated
  using (public.is_active_member() or id = public.current_role_id());

drop policy if exists role_permissions_read on public.role_permissions;
create policy role_permissions_read on public.role_permissions for select to authenticated
  using (public.current_app_role() = 'super_admin'::app_role
         or (public.is_active_member() and role_id = public.current_role_id()));

drop policy if exists permissions_read on public.permissions;
create policy permissions_read on public.permissions for select to authenticated
  using (public.current_app_role() = 'super_admin'::app_role
         or (public.is_active_member() and exists (
               select 1 from public.role_permissions rp
               where rp.permission_id = permissions.id
                 and rp.role_id = public.current_role_id())));

-- Reference / lab data: active members only
drop policy if exists faculties_read on public.faculties;
create policy faculties_read on public.faculties for select to authenticated using (public.is_active_member());

drop policy if exists program_studies_read on public.program_studies;
create policy program_studies_read on public.program_studies for select to authenticated using (public.is_active_member());

drop policy if exists courses_read on public.courses;
create policy courses_read on public.courses for select to authenticated using (public.is_active_member());

drop policy if exists laboratories_read on public.laboratories;
create policy laboratories_read on public.laboratories for select to authenticated using (public.is_active_member());

drop policy if exists schedule_read on public.laboratory_schedule_entries;
create policy schedule_read on public.laboratory_schedule_entries for select to authenticated using (public.is_active_member());

drop policy if exists categories_read on public.equipment_categories;
create policy categories_read on public.equipment_categories for select to authenticated using (public.is_active_member());

drop policy if exists equipment_read on public.equipment;
create policy equipment_read on public.equipment for select to authenticated using (public.is_active_member());

drop policy if exists consumables_read on public.consumables;
create policy consumables_read on public.consumables for select to authenticated using (public.is_active_member());

drop policy if exists calibrations_read on public.calibrations;
create policy calibrations_read on public.calibrations for select to authenticated using (public.is_active_member());