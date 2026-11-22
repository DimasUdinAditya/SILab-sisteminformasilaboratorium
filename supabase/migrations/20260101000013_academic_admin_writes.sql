-- Super Admin manages faculties, study programmes, courses and lecturer assignments from the Akademik page.
-- Other users only read these tables (see the read policies in 0000 and 0010).
grant insert, update, delete on public.faculties, public.program_studies, public.courses, public.lecturer_assignments
  to authenticated;

drop policy if exists faculties_admin_write on public.faculties;
create policy faculties_admin_write on public.faculties for all to authenticated
  using (public.current_app_role() = 'super_admin') with check (public.current_app_role() = 'super_admin');

drop policy if exists program_studies_admin_write on public.program_studies;
create policy program_studies_admin_write on public.program_studies for all to authenticated
  using (public.current_app_role() = 'super_admin') with check (public.current_app_role() = 'super_admin');

drop policy if exists courses_admin_write on public.courses;
create policy courses_admin_write on public.courses for all to authenticated
  using (public.current_app_role() = 'super_admin') with check (public.current_app_role() = 'super_admin');

drop policy if exists lecturer_assignments_admin_write on public.lecturer_assignments;
create policy lecturer_assignments_admin_write on public.lecturer_assignments for all to authenticated
  using (public.current_app_role() = 'super_admin') with check (public.current_app_role() = 'super_admin');
