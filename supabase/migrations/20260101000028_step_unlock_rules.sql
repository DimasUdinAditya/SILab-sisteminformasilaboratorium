-- Tahap 3: aturan buka tahapan per modul.
-- step_rules berbentuk { "<tahap>": { "mode": "always" | "after_previous" | "after_step", "after": "<tahap>" } }.
-- Tahap yang tidak ada di objek ini memakai "after_previous" (perilaku lama).

alter table public.modules add column if not exists step_rules jsonb not null default '{}'::jsonb;

-- Salinan modul ikut menyalin aturan tahapan. Simulasi juga menyalin katalog dan tampilan (Tahap 2).
create or replace function public.duplicate_module(_module_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare src public.modules%rowtype; _new uuid; m record; a record; q record; _nm uuid; _na uuid; _nq uuid;
begin
  if not public.can_manage_module(_module_id) then raise exception 'Akses ditolak'; end if;
  select * into src from public.modules where id = _module_id;
  insert into public.modules (course_id, lecturer_id, title, description, status, step_order, step_rules)
  values (src.course_id, auth.uid(), src.title || ' (salinan)', src.description, 'Draft', src.step_order, src.step_rules)
  returning id into _new;
  -- Materi disalin satu per satu agar hotspot bisa ikut dengan id materi yang baru.
  for m in select * from public.materials where module_id = _module_id loop
    insert into public.materials (module_id, title, type, content, media_asset_id, sort_order)
    values (_new, m.title, m.type, m.content, m.media_asset_id, m.sort_order)
    returning id into _nm;
    insert into public.hotspots (material_id, pos_x, pos_y, title, description, media_asset_id)
    select _nm, pos_x, pos_y, title, description, media_asset_id from public.hotspots where material_id = m.id;
  end loop;
  insert into public.procedures (module_id, step_no, title, instruction, media_asset_id)
  select _new, step_no, title, instruction, media_asset_id from public.procedures where module_id = _module_id;
  insert into public.simulations (module_id, title, type, external_url, media_asset_id, config, catalog_id, display_mode)
  select _new, title, type, external_url, media_asset_id, config, catalog_id, display_mode from public.simulations where module_id = _module_id;
  insert into public.self_evaluations (module_id, title, items)
  select _new, title, items from public.self_evaluations where module_id = _module_id;
  for a in select * from public.assessments where module_id = _module_id loop
    insert into public.assessments (module_id, title, type, duration_min, max_attempt, passing_grade)
    values (_new, a.title, a.type, a.duration_min, a.max_attempt, a.passing_grade)
    returning id into _na;
    for q in select * from public.questions where assessment_id = a.id loop
      insert into public.questions (assessment_id, question_text, type, score, sort_order, topic_id)
      values (_na, q.question_text, q.type, q.score, q.sort_order, q.topic_id)
      returning id into _nq;
      insert into public.question_options (question_id, option_text, is_correct)
      select _nq, option_text, is_correct from public.question_options where question_id = q.id;
    end loop;
  end loop;
  return _new;
end $$;
