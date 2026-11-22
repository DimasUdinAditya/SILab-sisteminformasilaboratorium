-- RPC functions the app calls but that are not in the repo.
--
-- Status of each function:
--   CONFIRMED  : signature matches the app and types.ts; logic follows the table/status design.
--   INFERRED   : logic is a reasonable guess from names, columns and the status enums.
--                Review before relying on it. Each section header says INFERRED.
--   Every function here is implemented. None of the logic was copied from the original database.

-- ---------------------------------------------------------------- small helpers (CONFIRMED)

create or replace function public.try_uuid(_t text)
returns uuid language plpgsql immutable as $$
begin
  return _t::uuid;
exception when others then
  return null;
end $$;

create or replace function public.jkt_today()
returns text language sql stable as $$
  select to_char(now() at time zone 'Asia/Jakarta', 'YYYY-MM-DD')
$$;

create or replace function public.log_status(
  _borrowing_id uuid, _from text, _note text, _request_id uuid, _to text
) returns void language sql security definer set search_path = public as $$
  insert into public.status_history (borrowing_id, lab_usage_request_id, from_status, to_status, note, changed_by)
  values (_borrowing_id, _request_id, _from, _to, _note, auth.uid())
$$;

create or replace function public.equipment_lab_id(_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select laboratory_id from public.equipment where id = _id
$$;

create or replace function public.consumable_lab_id(_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select laboratory_id from public.consumables where id = _id
$$;

create or replace function public.assessment_module_id(_assessment_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select module_id from public.assessments where id = _assessment_id
$$;

create or replace function public.attempt_module_id(_attempt_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select a.module_id from public.assessment_attempts t join public.assessments a on a.id = t.assessment_id
  where t.id = _attempt_id
$$;

create or replace function public.attempt_student_id(_attempt_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select student_id from public.assessment_attempts where id = _attempt_id
$$;

create or replace function public.material_module_id(_material_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select module_id from public.materials where id = _material_id
$$;

create or replace function public.question_module_id(_question_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select a.module_id from public.questions q join public.assessments a on a.id = q.assessment_id
  where q.id = _question_id
$$;

create or replace function public.self_evaluation_module_id(_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select module_id from public.self_evaluations where id = _id
$$;

-- ---------------------------------------------------------------- people and access (INFERRED)

-- Course lecturers are listed in lecturer_assignments.
create or replace function public.is_course_lecturer(_course_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.lecturer_assignments la
                 where la.course_id = _course_id and la.lecturer_id = auth.uid())
$$;

-- A student belongs to a lecturer when a course of the lecturer matches the student's study programme.
create or replace function public.is_lecturer_student(_student_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.profiles s
    join public.courses c on c.program_study_id = s.program_study_id
    join public.lecturer_assignments la on la.course_id = c.id
    where s.id = _student_id and la.lecturer_id = auth.uid()
  )
$$;

-- INFERRED: a profile is a lab client when it has requested the lab of the caller (kalab).
create or replace function public.is_lab_client(_profile_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.lab_usage_requests r
                 join public.laboratories l on l.id = r.laboratory_id
                 where r.requester_id = _profile_id and l.kalab_id = auth.uid())
      or exists (select 1 from public.equipment_borrowings b
                 join public.laboratories l on l.id = b.laboratory_id
                 where b.borrower_id = _profile_id and l.kalab_id = auth.uid())
$$;

-- INFERRED: heads of laboratory roles.
create or replace function public.is_lab_head(_profile_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p join public.roles r on r.id = p.role_id
                 where p.id = _profile_id and r.code in ('kalab', 'kaprodi', 'wadek1'))
$$;

-- A student who was granted a module can open it. Lecturers and Super Admin can manage it.
create or replace function public.can_manage_module(_module_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_app_role() = 'super_admin'
      or exists (select 1 from public.modules m
                 where m.id = _module_id
                   and (m.lecturer_id = auth.uid() or public.is_course_lecturer(m.course_id)))
$$;

create or replace function public.has_module_access(_module_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.module_access ma
                 where ma.module_id = _module_id and ma.student_id = auth.uid())
$$;

create or replace function public.can_view_module(_module_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_manage_module(_module_id)
      or exists (select 1 from public.modules m
                 where m.id = _module_id and m.status = 'Published'
                   and public.has_module_access(_module_id))
$$;

-- Media is visible when it belongs to a module the caller can view, or when the caller uploaded it.
create or replace function public.can_view_media(_asset_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.media_assets a where a.id = _asset_id and a.uploaded_by = auth.uid())
      or exists (select 1 from public.materials m where m.media_asset_id = _asset_id and public.can_view_module(m.module_id))
      or exists (select 1 from public.procedures p where p.media_asset_id = _asset_id and public.can_view_module(p.module_id))
      or exists (select 1 from public.simulations s where s.media_asset_id = _asset_id and public.can_view_module(s.module_id))
$$;

create or replace function public.can_view_media_path(_path text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.media_assets a where a.file_url = _path and public.can_view_media(a.id))
$$;

-- Storage paths for borrowing photos start with the borrowing id: "<borrowing_id>/...".
create or replace function public.can_upload_readiness(_path text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.equipment_borrowings b
                 join public.laboratories l on l.id = b.laboratory_id
                 where b.id::text = split_part(_path, '/', 1) and l.kalab_id = auth.uid())
$$;

create or replace function public.can_upload_return(_path text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.equipment_borrowings b
                 where b.id::text = split_part(_path, '/', 1) and b.borrower_id = auth.uid())
$$;

create or replace function public.can_manage_certificate(_path text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_app_role() in ('kalab', 'super_admin')
$$;

-- ---------------------------------------------------------------- laboratory requests (INFERRED flow)

create or replace function public.submit_lab_request(
  _date date, _end time, _lab_id uuid, _purpose text, _start time
) returns uuid language plpgsql security definer set search_path = public as $$
declare _id uuid;
begin
  if not public.is_active_member() then raise exception 'Akun tidak aktif'; end if;
  if _end <= _start then raise exception 'Jam selesai harus setelah jam mulai'; end if;
  if btrim(coalesce(_purpose, '')) = '' then raise exception 'Tujuan penggunaan wajib diisi'; end if;
  insert into public.lab_usage_requests (requester_id, laboratory_id, usage_date, start_time, end_time, purpose, status)
  values (auth.uid(), _lab_id, _date, _start, _end, _purpose, 'Diajukan')
  returning id into _id;
  perform public.log_status(null, null, 'Diajukan', _id, 'Diajukan');
  return _id;
end $$;

create or replace function public.approve_lab_request(_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare r public.lab_usage_requests%rowtype; _entry uuid;
begin
  select * into r from public.lab_usage_requests where id = _id;
  if not found then raise exception 'Pengajuan tidak ditemukan'; end if;
  if not public.is_lab_kalab(r.laboratory_id) then raise exception 'Akses ditolak'; end if;
  if r.status <> 'Diajukan' then raise exception 'Pengajuan sudah diproses'; end if;
  -- INFERRED: reject double-booking of the same lab slot.
  if exists (select 1 from public.lab_usage_requests o
             where o.laboratory_id = r.laboratory_id and o.usage_date = r.usage_date
               and o.status = 'Disetujui' and o.start_time < r.end_time and o.end_time > r.start_time) then
    raise exception 'Jadwal laboratorium bentrok dengan pengajuan lain yang sudah disetujui';
  end if;
  update public.lab_usage_requests
     set status = 'Disetujui', approved_by = auth.uid(), approved_at = now()
   where id = _id;
  insert into public.laboratory_schedule_entries (laboratory_id, lab_usage_request_id, date, start_time, end_time, activity, is_locked)
  values (r.laboratory_id, _id, r.usage_date, r.start_time, r.end_time, r.purpose, true)
  returning id into _entry;
  perform public.log_status(null, 'Diajukan', null, _id, 'Disetujui');
  return _id::text;
end $$;

create or replace function public.reject_lab_request(_id uuid, _reason text)
returns void language plpgsql security definer set search_path = public as $$
declare r public.lab_usage_requests%rowtype;
begin
  select * into r from public.lab_usage_requests where id = _id;
  if not found then raise exception 'Pengajuan tidak ditemukan'; end if;
  if not public.is_lab_kalab(r.laboratory_id) then raise exception 'Akses ditolak'; end if;
  if r.status <> 'Diajukan' then raise exception 'Pengajuan sudah diproses'; end if;
  if btrim(coalesce(_reason, '')) = '' then raise exception 'Alasan penolakan wajib diisi'; end if;
  update public.lab_usage_requests
     set status = 'Ditolak', rejection_reason = _reason, approved_by = auth.uid(), approved_at = now()
   where id = _id;
  perform public.log_status(null, 'Diajukan', _reason, _id, 'Ditolak');
end $$;

-- ---------------------------------------------------------------- equipment borrowing (INFERRED flow)
-- Diajukan -> Disetujui (approve) -> Dipinjam (confirm_readiness: stock leaves the lab)
--   -> Dikembalikan (submit_return) -> Dikonfirmasi (verify_return, Sesuai)
--                                   -> Ditunggu (verify_return, Tidak_Sesuai) -> Dikonfirmasi (close_borrowing)
-- Consumable-only borrowings can be closed with complete_consumable_borrowing (Dipinjam -> Dikonfirmasi).

create or replace function public.submit_borrowing(
  _borrow_date date, _items jsonb, _lab_id uuid, _purpose text, _return_due_date date
) returns uuid language plpgsql security definer set search_path = public as $$
declare _id uuid; it jsonb; _type public.item_type; _qty integer;
begin
  if not public.is_active_member() then raise exception 'Akun tidak aktif'; end if;
  if btrim(coalesce(_purpose, '')) = '' then raise exception 'Tujuan peminjaman wajib diisi'; end if;
  if jsonb_typeof(_items) <> 'array' or jsonb_array_length(_items) = 0 then
    raise exception 'Pilih minimal satu alat atau bahan';
  end if;
  insert into public.equipment_borrowings (borrower_id, laboratory_id, borrow_date, return_due_date, purpose, status, is_overdue)
  values (auth.uid(), _lab_id, _borrow_date, _return_due_date, _purpose, 'Diajukan', false)
  returning id into _id;
  for it in select value from jsonb_array_elements(_items) loop
    _type := (it->>'item_type')::public.item_type;
    _qty := (it->>'quantity')::integer;
    if _qty is null or _qty <= 0 then raise exception 'Jumlah harus lebih dari nol'; end if;
    if _type = 'Alat' then
      insert into public.borrowing_items (borrowing_id, item_type, equipment_id, quantity, must_return)
      values (_id, _type, (it->>'equipment_id')::uuid, _qty, true);
    else
      insert into public.borrowing_items (borrowing_id, item_type, consumable_id, quantity, must_return)
      values (_id, _type, (it->>'consumable_id')::uuid, _qty, false);
    end if;
  end loop;
  perform public.log_status(_id, null, 'Diajukan', null, 'Diajukan');
  return _id;
end $$;

create or replace function public.borrowing_for_kalab(_expected public.borrowing_status, _id uuid)
returns public.equipment_borrowings language plpgsql security definer set search_path = public as $$
declare b public.equipment_borrowings%rowtype;
begin
  select * into b from public.equipment_borrowings where id = _id;
  if not found then raise exception 'Peminjaman tidak ditemukan'; end if;
  if not public.is_lab_kalab(b.laboratory_id) then raise exception 'Akses ditolak'; end if;
  if b.status <> _expected then raise exception 'Status peminjaman tidak sesuai (saat ini %)', b.status; end if;
  return b;
end $$;

create or replace function public.approve_borrowing(_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare b public.equipment_borrowings%rowtype;
begin
  b := public.borrowing_for_kalab('Diajukan', _id);
  update public.equipment_borrowings
     set status = 'Disetujui', approved_by = auth.uid(), approved_at = now()
   where id = _id;
  perform public.log_status(_id, 'Diajukan', null, null, 'Disetujui');
end $$;

create or replace function public.reject_borrowing(_id uuid, _reason text)
returns void language plpgsql security definer set search_path = public as $$
declare b public.equipment_borrowings%rowtype;
begin
  b := public.borrowing_for_kalab('Diajukan', _id);
  if btrim(coalesce(_reason, '')) = '' then raise exception 'Alasan penolakan wajib diisi'; end if;
  update public.equipment_borrowings
     set status = 'Ditolak', rejection_reason = _reason, approved_by = auth.uid(), approved_at = now()
   where id = _id;
  perform public.log_status(_id, 'Diajukan', _reason, null, 'Ditolak');
end $$;

-- Kalab hands the items over. Stock leaves the lab here.
create or replace function public.confirm_readiness(_id uuid, _note text, _photo_path text)
returns void language plpgsql security definer set search_path = public as $$
declare b public.equipment_borrowings%rowtype; it record;
begin
  b := public.borrowing_for_kalab('Disetujui', _id);
  insert into public.borrowing_readiness (borrowing_id, note, photo_url, uploaded_by, uploaded_at)
  values (_id, _note, _photo_path, auth.uid(), now());
  for it in select * from public.borrowing_items where borrowing_id = _id loop
    if it.consumable_id is not null then
      perform public.adjust_stock(it.consumable_id, it.quantity, 'out');
    else
      update public.equipment set qty_available = qty_available - it.quantity
       where id = it.equipment_id;
      if not found or (select qty_available from public.equipment where id = it.equipment_id) < 0 then
        raise exception 'Stok alat tidak cukup';
      end if;
    end if;
  end loop;
  update public.equipment_borrowings set status = 'Dipinjam' where id = _id;
  perform public.log_status(_id, 'Disetujui', _note, null, 'Dipinjam');
end $$;

create or replace function public.submit_return(_id uuid, _note text, _photo_path text)
returns void language plpgsql security definer set search_path = public as $$
declare b public.equipment_borrowings%rowtype;
begin
  select * into b from public.equipment_borrowings where id = _id;
  if not found or b.borrower_id <> auth.uid() then raise exception 'Akses ditolak'; end if;
  if b.status <> 'Dipinjam' then raise exception 'Peminjaman belum dalam status Dipinjam'; end if;
  insert into public.borrowing_return_evidence (borrowing_id, note, photo_url, uploaded_by, uploaded_at)
  values (_id, _note, _photo_path, auth.uid(), now());
  update public.equipment_borrowings set status = 'Dikembalikan' where id = _id;
  perform public.log_status(_id, 'Dipinjam', _note, null, 'Dikembalikan');
end $$;

-- Puts borrowed equipment back into the available count.
create or replace function public.restore_borrowed_equipment(_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare b public.equipment_borrowings%rowtype; it record;
begin
  select * into b from public.equipment_borrowings where id = _id;
  if not found or not public.is_lab_kalab(b.laboratory_id) then raise exception 'Akses ditolak'; end if;
  for it in select * from public.borrowing_items where borrowing_id = _id and must_return and equipment_id is not null loop
    update public.equipment set qty_available = qty_available + it.quantity where id = it.equipment_id;
  end loop;
end $$;

create or replace function public.verify_return(_id uuid, _note text, _result public.verification_result)
returns void language plpgsql security definer set search_path = public as $$
declare b public.equipment_borrowings%rowtype;
begin
  b := public.borrowing_for_kalab('Dikembalikan', _id);
  insert into public.borrowing_verifications (borrowing_id, result, discrepancy_note, verified_by, verified_at)
  values (_id, _result, _note, auth.uid(), now());
  if _result = 'Sesuai' then
    perform public.restore_borrowed_equipment(_id);
    update public.equipment_borrowings set status = 'Dikonfirmasi' where id = _id;
    perform public.log_status(_id, 'Dikembalikan', _note, null, 'Dikonfirmasi');
  else
    update public.equipment_borrowings set status = 'Ditunggu' where id = _id;
    perform public.log_status(_id, 'Dikembalikan', _note, null, 'Ditunggu');
  end if;
end $$;

-- INFERRED: a follow-up note is stored on the latest verification.
create or replace function public.close_borrowing(_follow_up text, _id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare b public.equipment_borrowings%rowtype;
begin
  b := public.borrowing_for_kalab('Ditunggu', _id);
  update public.borrowing_verifications set follow_up = _follow_up
   where id = (select id from public.borrowing_verifications where borrowing_id = _id order by verified_at desc limit 1);
  update public.equipment_borrowings set status = 'Dikonfirmasi' where id = _id;
  perform public.log_status(_id, 'Ditunggu', _follow_up, null, 'Dikonfirmasi');
end $$;

create or replace function public.complete_consumable_borrowing(_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare b public.equipment_borrowings%rowtype;
begin
  b := public.borrowing_for_kalab('Dipinjam', _id);
  if exists (select 1 from public.borrowing_items where borrowing_id = _id and equipment_id is not null) then
    raise exception 'Peminjaman ini berisi alat, gunakan verifikasi pengembalian';
  end if;
  update public.equipment_borrowings set status = 'Dikonfirmasi' where id = _id;
  perform public.log_status(_id, 'Dipinjam', null, null, 'Dikonfirmasi');
end $$;

-- Stock changes for consumables. 'in' adds, 'out' removes (never below zero), 'adjustment' sets the total.
create or replace function public.adjust_stock(_consumable_id uuid, _qty integer, _type public.stock_movement_type)
returns integer language plpgsql security definer set search_path = public as $$
declare _new integer;
begin
  if not public.is_lab_kalab(public.consumable_lab_id(_consumable_id)) then raise exception 'Akses ditolak'; end if;
  if _qty is null or _qty < 0 then raise exception 'Jumlah tidak valid'; end if;
  if _type = 'in' then
    update public.consumables set stock = stock + _qty where id = _consumable_id returning stock into _new;
  elsif _type = 'out' then
    update public.consumables set stock = stock - _qty
     where id = _consumable_id and stock >= _qty returning stock into _new;
    if _new is null then raise exception 'Stok bahan tidak cukup'; end if;
  else
    update public.consumables set stock = _qty where id = _consumable_id returning stock into _new;
  end if;
  insert into public.stock_movements (consumable_id, quantity, type, created_by)
  values (_consumable_id, _qty, _type, auth.uid());
  return _new;
end $$;

-- ---------------------------------------------------------------- calibration (INFERRED thresholds)

create or replace function public.calibration_status_for(_next date)
returns public.calibration_status language sql stable as $$
  select case
    when _next is null then 'Kedaluwarsa'::public.calibration_status
    when _next < (now() at time zone 'Asia/Jakarta')::date then 'Kedaluwarsa'::public.calibration_status
    when _next <= (now() at time zone 'Asia/Jakarta')::date + 30 then 'Mendekati'::public.calibration_status
    else 'Valid'::public.calibration_status
  end
$$;

create or replace function public.equipment_calibration_ok(_equipment_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select not (select requires_calibration from public.equipment where id = _equipment_id)
      or exists (select 1 from public.calibrations c
                 where c.equipment_id = _equipment_id and c.status in ('Valid', 'Mendekati'))
$$;

create or replace function public.save_calibration(_certificate_path text, _equipment_id uuid, _last date, _next date)
returns public.calibrations language plpgsql security definer set search_path = public as $$
declare c public.calibrations%rowtype;
begin
  if not public.is_lab_kalab(public.equipment_lab_id(_equipment_id)) and public.current_app_role() <> 'super_admin' then
    raise exception 'Akses ditolak';
  end if;
  update public.calibrations
     set last_calibrated = _last, next_calibration = _next, certificate_url = _certificate_path,
         status = public.calibration_status_for(_next), updated_by = auth.uid()
   where equipment_id = _equipment_id
   returning * into c;
  if not found then
    insert into public.calibrations (equipment_id, last_calibrated, next_calibration, certificate_url, status, updated_by)
    values (_equipment_id, _last, _next, _certificate_path, public.calibration_status_for(_next), auth.uid())
    returning * into c;
  end if;
  return c;
end $$;

-- ---------------------------------------------------------------- modules (INFERRED)

create or replace function public.publish_module(_module_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage_module(_module_id) then raise exception 'Akses ditolak'; end if;
  update public.modules set status = 'Published', published_at = now(), published_by = auth.uid()
   where id = _module_id;
  return 1;
end $$;

-- Copies a module with its materials, procedures, simulations, self-evaluations, assessments, questions and options.
-- Hotspots, usage instructions and media links are copied as they are. The copy starts as a Draft.
create or replace function public.duplicate_module(_module_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare src public.modules%rowtype; _new uuid; a record; q record; _na uuid; _nq uuid;
begin
  if not public.can_manage_module(_module_id) then raise exception 'Akses ditolak'; end if;
  select * into src from public.modules where id = _module_id;
  insert into public.modules (course_id, lecturer_id, title, description, status, step_order)
  values (src.course_id, auth.uid(), src.title || ' (salinan)', src.description, 'Draft', src.step_order)
  returning id into _new;
  insert into public.materials (module_id, title, type, content, media_asset_id, sort_order)
  select _new, title, type, content, media_asset_id, sort_order from public.materials where module_id = _module_id;
  insert into public.procedures (module_id, step_no, title, instruction, media_asset_id)
  select _new, step_no, title, instruction, media_asset_id from public.procedures where module_id = _module_id;
  insert into public.simulations (module_id, title, type, external_url, media_asset_id, config)
  select _new, title, type, external_url, media_asset_id, config from public.simulations where module_id = _module_id;
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

-- ---------------------------------------------------------------- learning progress (INFERRED)

create or replace function public.record_progress(_completed_step text, _current_step text, _module_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare total integer; done jsonb; pct numeric; row_ public.learning_progress%rowtype;
begin
  if not public.has_module_access(_module_id) then raise exception 'Akses ditolak'; end if;
  select jsonb_array_length(step_order) into total from public.modules where id = _module_id;
  select * into row_ from public.learning_progress where student_id = auth.uid() and module_id = _module_id;
  done := coalesce(row_.completed_steps, '[]'::jsonb);
  if _completed_step is not null and not (done @> to_jsonb(_completed_step)) then
    done := done || to_jsonb(_completed_step);
  end if;
  pct := round(100.0 * jsonb_array_length(done) / nullif(total, 0), 2);
  if row_.id is null then
    insert into public.learning_progress (student_id, module_id, current_step, completed_steps, percent, last_accessed_at, completed_at)
    values (auth.uid(), _module_id, _current_step, done, coalesce(pct, 0),
            now(), case when pct >= 100 then now() end);
  end if;
  update public.learning_progress
     set current_step = _current_step, completed_steps = done, percent = coalesce(pct, 0),
         last_accessed_at = now(), completed_at = case when pct >= 100 then now() else null end
   where student_id = auth.uid() and module_id = _module_id
  returning * into row_;
  return to_jsonb(row_);
end $$;

-- ---------------------------------------------------------------- assessments (INFERRED scoring)
-- submit_attempt answers: [{ "question_id": uuid, "answer_text": text?, "selected_options": [option uuid, ...] }]
-- pg, benar_salah : full score if the one selected option is correct, else 0
-- pg_kompleks     : full score only if the selected options are exactly the correct ones
-- esai            : no score yet; the attempt waits for review (waiting_review)

create or replace function public.start_attempt(_assessment_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare a public.assessments%rowtype; _id uuid; n integer;
begin
  select * into a from public.assessments where id = _assessment_id;
  if not found then raise exception 'Asesmen tidak ditemukan'; end if;
  if not public.has_module_access(a.module_id) then raise exception 'Akses ditolak'; end if;
  select id into _id from public.assessment_attempts
   where assessment_id = _assessment_id and student_id = auth.uid() and status = 'in_progress';
  if _id is not null then return _id; end if;
  select count(*) into n from public.assessment_attempts where assessment_id = _assessment_id and student_id = auth.uid();
  if a.max_attempt is not null and n >= a.max_attempt then raise exception 'Kesempatan mengerjakan sudah habis'; end if;
  insert into public.assessment_attempts (assessment_id, student_id, attempt_no, status, started_at)
  values (_assessment_id, auth.uid(), n + 1, 'in_progress', now())
  returning id into _id;
  return _id;
end $$;

create or replace function public.submit_attempt(_answers jsonb, _attempt_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare t public.assessment_attempts%rowtype; q record; ans jsonb; sel uuid[]; corr uuid[];
        pts numeric; total numeric := 0; has_essay boolean := false; _ans_id uuid;
begin
  select * into t from public.assessment_attempts where id = _attempt_id;
  if not found or t.student_id <> auth.uid() then raise exception 'Akses ditolak'; end if;
  if t.status <> 'in_progress' then raise exception 'Percobaan sudah dikirim'; end if;
  for q in select * from public.questions where assessment_id = t.assessment_id order by sort_order loop
    ans := (select value from jsonb_array_elements(_answers) v where v.value->>'question_id' = q.id::text limit 1);
    sel := coalesce(array(select jsonb_array_elements_text(coalesce(ans->'selected_options', '[]'::jsonb))::uuid), '{}');
    corr := array(select o.id from public.question_options o where o.question_id = q.id and o.is_correct);
    pts := null;
    if q.type in ('pg', 'benar_salah') then
      pts := case when array_length(sel, 1) = 1 and sel <@ corr then q.score else 0 end;
    elsif q.type = 'pg_kompleks' then
      pts := case when sel @> corr and corr @> sel then q.score else 0 end;
    else
      has_essay := true;
    end if;
    insert into public.answers (attempt_id, question_id, answer_text, selected_options, score)
    values (_attempt_id, q.id, ans->>'answer_text', coalesce(ans->'selected_options', '[]'::jsonb), pts)
    returning id into _ans_id;
    total := total + coalesce(pts, 0);
  end loop;
  update public.assessment_attempts
     set status = case when has_essay then 'waiting_review'::public.attempt_status else 'graded'::public.attempt_status end,
         total_score = case when has_essay then null else total end,
         submitted_at = now()
   where id = _attempt_id;
  return jsonb_build_object('status', case when has_essay then 'waiting_review' else 'graded' end,
                            'total_score', case when has_essay then null else total end);
end $$;

-- Lecturer grades essay answers: [{ "answer_id": uuid, "score": number, "feedback": text? }]
create or replace function public.grade_attempt(_attempt_id uuid, _grades jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g jsonb; pending integer; total numeric;
begin
  if not public.can_manage_module(public.attempt_module_id(_attempt_id)) then raise exception 'Akses ditolak'; end if;
  for g in select value from jsonb_array_elements(_grades) loop
    update public.answers
       set score = (g->>'score')::numeric, feedback = g->>'feedback', graded_by = auth.uid()
     where id = (g->>'answer_id')::uuid and attempt_id = _attempt_id;
  end loop;
  select count(*) into pending from public.answers a
    join public.questions q on q.id = a.question_id
   where a.attempt_id = _attempt_id and q.type = 'esai' and a.score is null;
  if pending = 0 then
    select coalesce(sum(score), 0) into total from public.answers where attempt_id = _attempt_id;
    update public.assessment_attempts set status = 'graded', total_score = total where id = _attempt_id;
    return jsonb_build_object('status', 'graded', 'total_score', total);
  end if;
  return jsonb_build_object('status', 'waiting_review', 'total_score', null);
end $$;

-- Questions for a student. The answer key (is_correct) is never returned here.
create or replace function public.get_assessment_for_student(_assessment_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare a public.assessments%rowtype;
begin
  select * into a from public.assessments where id = _assessment_id;
  if not found or not public.has_module_access(a.module_id) then raise exception 'Akses ditolak'; end if;
  return jsonb_build_object(
    'id', a.id, 'title', a.title, 'type', a.type, 'duration_min', a.duration_min,
    'max_attempt', a.max_attempt, 'passing_grade', a.passing_grade,
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id, 'question_text', q.question_text, 'type', q.type, 'score', q.score, 'sort_order', q.sort_order,
        'options', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'option_text', o.option_text) order by o.id)
                             from public.question_options o where o.question_id = q.id), '[]'::jsonb)
      ) order by q.sort_order)
      from public.questions q where q.assessment_id = a.id
    ), '[]'::jsonb));
end $$;

-- Review: the lecturer always sees the key; the student sees it only after grading.
create or replace function public.get_attempt_review(_attempt_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare t public.assessment_attempts%rowtype; is_owner boolean; is_lecturer boolean;
begin
  select * into t from public.assessment_attempts where id = _attempt_id;
  if not found then raise exception 'Percobaan tidak ditemukan'; end if;
  is_owner := t.student_id = auth.uid();
  is_lecturer := public.can_manage_module(public.attempt_module_id(_attempt_id));
  if not (is_lecturer or (is_owner and t.status = 'graded')) then raise exception 'Akses ditolak'; end if;
  return jsonb_build_object(
    'attempt', to_jsonb(t),
    'answers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'answer_id', a.id, 'question_id', q.id, 'question_text', q.question_text, 'type', q.type,
        'max_score', q.score, 'answer_text', a.answer_text, 'selected_options', a.selected_options,
        'score', a.score, 'feedback', a.feedback,
        'correct_options', coalesce((select jsonb_agg(o.id) from public.question_options o
                                     where o.question_id = q.id and o.is_correct), '[]'::jsonb)
      ) order by q.sort_order)
      from public.answers a join public.questions q on q.id = a.question_id
      where a.attempt_id = _attempt_id
    ), '[]'::jsonb));
end $$;

-- ---------------------------------------------------------------- lock down execution
-- Browser roles may only call functions through policies or the app. Trigger functions keep running.
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig
           from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prokind = 'f' and p.proname not like 'trg_%'
             and p.proname not like 'audit_%' and p.proname not like 'notify_%'
             and p.proname not in ('handle_new_auth_user', 'queue_endorsement') loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated, service_role', f.sig);
  end loop;
end $$;
