-- Row level security for the base tables. Written from the rules in AGENTS.md and the
-- helper functions in this repo. Reads go through is_active_member() or the access helpers;
-- writes that change state go through the RPC functions, so the browser gets few write policies.
-- Policies in migrations 0000-0005 are kept as they are.

-- ---------------------------------------------------------------- profiles
-- Browser code may only change profiles.name (column grant). Role, prodi and status changes go through server functions.
revoke update on public.profiles from authenticated;
grant update (name) on public.profiles to authenticated;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_active_member());

drop policy if exists profiles_update_own_name on public.profiles;
create policy profiles_update_own_name on public.profiles for update to authenticated
  using (id = auth.uid() and public.is_active_member())
  with check (id = auth.uid());

-- ---------------------------------------------------------------- shared reference tables (active members only)
drop policy if exists topics_read on public.topics;
create policy topics_read on public.topics for select to authenticated using (public.is_active_member());

drop policy if exists lecturer_assignments_read on public.lecturer_assignments;
create policy lecturer_assignments_read on public.lecturer_assignments for select to authenticated using (public.is_active_member());

drop policy if exists usage_instructions_read on public.usage_instructions;
create policy usage_instructions_read on public.usage_instructions for select to authenticated using (public.is_active_member());

-- ---------------------------------------------------------------- laboratory requests and borrowing
drop policy if exists lab_usage_requests_read on public.lab_usage_requests;
create policy lab_usage_requests_read on public.lab_usage_requests for select to authenticated
  using (public.can_view_lab_request(id));

drop policy if exists equipment_borrowings_read on public.equipment_borrowings;
create policy equipment_borrowings_read on public.equipment_borrowings for select to authenticated
  using (public.can_view_borrowing(id));

drop policy if exists borrowing_items_read on public.borrowing_items;
create policy borrowing_items_read on public.borrowing_items for select to authenticated
  using (public.can_view_borrowing(borrowing_id));

drop policy if exists status_history_read on public.status_history;
create policy status_history_read on public.status_history for select to authenticated
  using ((borrowing_id is not null and public.can_view_borrowing(borrowing_id))
      or (lab_usage_request_id is not null and public.can_view_lab_request(lab_usage_request_id)));

drop policy if exists borrowing_readiness_read on public.borrowing_readiness;
create policy borrowing_readiness_read on public.borrowing_readiness for select to authenticated
  using (public.can_view_borrowing(borrowing_id));

drop policy if exists borrowing_return_evidence_read on public.borrowing_return_evidence;
create policy borrowing_return_evidence_read on public.borrowing_return_evidence for select to authenticated
  using (public.can_view_borrowing(borrowing_id));

drop policy if exists borrowing_verifications_read on public.borrowing_verifications;
create policy borrowing_verifications_read on public.borrowing_verifications for select to authenticated
  using (public.can_view_borrowing(borrowing_id));

drop policy if exists stock_movements_read on public.stock_movements;
create policy stock_movements_read on public.stock_movements for select to authenticated
  using (public.is_lab_kalab(public.consumable_lab_id(consumable_id)));

-- ---------------------------------------------------------------- modules and learning content
drop policy if exists modules_read on public.modules;
create policy modules_read on public.modules for select to authenticated
  using (public.can_view_module(id));

drop policy if exists modules_insert_lecturer on public.modules;
create policy modules_insert_lecturer on public.modules for insert to authenticated
  with check (lecturer_id = auth.uid() and public.current_app_role() in ('dosen', 'super_admin'));

drop policy if exists modules_update_manager on public.modules;
create policy modules_update_manager on public.modules for update to authenticated
  using (public.can_manage_module(id)) with check (public.can_manage_module(id));

drop policy if exists modules_delete_manager on public.modules;
create policy modules_delete_manager on public.modules for delete to authenticated
  using (public.can_manage_module(id));

-- Module content: students read what they can view; lecturers and Super Admin write it.
do $$
declare t text;
begin
  foreach t in array array['materials', 'procedures', 'simulations', 'self_evaluations', 'assessments'] loop
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.can_view_module(module_id))', t || '_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_write', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.can_manage_module(module_id)) with check (public.can_manage_module(module_id))',
      t || '_write', t);
  end loop;
end $$;

-- Hotspots belong to a material; the same rule applies.
drop policy if exists hotspots_read on public.hotspots;
create policy hotspots_read on public.hotspots for select to authenticated
  using (public.can_view_module(public.material_module_id(material_id)));

drop policy if exists hotspots_write on public.hotspots;
create policy hotspots_write on public.hotspots for all to authenticated
  using (public.can_manage_module(public.material_module_id(material_id)))
  with check (public.can_manage_module(public.material_module_id(material_id)));

-- Questions and answer keys: only lecturers read them directly. Students use get_assessment_for_student.
drop policy if exists questions_manage on public.questions;
create policy questions_manage on public.questions for all to authenticated
  using (public.can_manage_module(public.assessment_module_id(assessment_id)))
  with check (public.can_manage_module(public.assessment_module_id(assessment_id)));

drop policy if exists question_options_manage on public.question_options;
create policy question_options_manage on public.question_options for all to authenticated
  using (public.can_manage_module(public.question_module_id(question_id)))
  with check (public.can_manage_module(public.question_module_id(question_id)));

-- Access list and progress.
drop policy if exists module_access_read on public.module_access;
create policy module_access_read on public.module_access for select to authenticated
  using (student_id = auth.uid() or public.can_manage_module(module_id));

drop policy if exists module_access_write on public.module_access;
create policy module_access_write on public.module_access for all to authenticated
  using (public.can_manage_module(module_id)) with check (public.can_manage_module(module_id));

drop policy if exists learning_progress_read on public.learning_progress;
create policy learning_progress_read on public.learning_progress for select to authenticated
  using (student_id = auth.uid() or public.can_manage_module(module_id));

-- Attempts and answers: students read their own attempts through RPCs; lecturers read through policy.
drop policy if exists assessment_attempts_read on public.assessment_attempts;
create policy assessment_attempts_read on public.assessment_attempts for select to authenticated
  using (student_id = auth.uid() or public.can_manage_module(public.assessment_module_id(assessment_id)));

drop policy if exists answers_read_lecturer on public.answers;
create policy answers_read_lecturer on public.answers for select to authenticated
  using (public.can_manage_module(public.attempt_module_id(attempt_id)));

drop policy if exists remedial_read on public.remedial_assignments;
create policy remedial_read on public.remedial_assignments for select to authenticated
  using (public.attempt_student_id(attempt_id) = auth.uid() or public.can_manage_module(public.attempt_module_id(attempt_id)));

drop policy if exists remedial_write on public.remedial_assignments;
create policy remedial_write on public.remedial_assignments for all to authenticated
  using (public.can_manage_module(public.attempt_module_id(attempt_id)))
  with check (public.can_manage_module(public.attempt_module_id(attempt_id)));

drop policy if exists self_eval_responses_read on public.self_evaluation_responses;
create policy self_eval_responses_read on public.self_evaluation_responses for select to authenticated
  using (student_id = auth.uid() or public.can_manage_module(public.self_evaluation_module_id(self_evaluation_id)));

drop policy if exists self_eval_responses_insert on public.self_evaluation_responses;
create policy self_eval_responses_insert on public.self_evaluation_responses for insert to authenticated
  with check (student_id = auth.uid() and public.can_view_module(public.self_evaluation_module_id(self_evaluation_id)));

-- ---------------------------------------------------------------- media
drop policy if exists media_assets_read on public.media_assets;
create policy media_assets_read on public.media_assets for select to authenticated
  using (uploaded_by = auth.uid() or public.can_view_media(id));

drop policy if exists media_assets_insert on public.media_assets;
create policy media_assets_insert on public.media_assets for insert to authenticated
  with check (uploaded_by = auth.uid() and public.is_active_member());

drop policy if exists media_assets_update_own on public.media_assets;
create policy media_assets_update_own on public.media_assets for update to authenticated
  using (uploaded_by = auth.uid()) with check (uploaded_by = auth.uid());
