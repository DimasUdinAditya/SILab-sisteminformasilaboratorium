-- ===== 1. Lock down Fase 4 tables that had no RLS =====
revoke all on public.document_templates, public.kalab_signatures, public.request_documents,
  public.notifications, public.audit_logs from anon, authenticated;
grant all on public.document_templates, public.kalab_signatures, public.request_documents,
  public.notifications, public.audit_logs to service_role;

grant select, insert, update, delete on public.document_templates to authenticated;
alter table public.document_templates enable row level security;
create policy doc_templates_read on public.document_templates for select to authenticated
  using (public.is_active_member());
create policy doc_templates_admin_write on public.document_templates for all to authenticated
  using (public.current_app_role() = 'super_admin') with check (public.current_app_role() = 'super_admin');

grant select on public.kalab_signatures to authenticated;
alter table public.kalab_signatures enable row level security;
create policy kalab_signatures_read_own on public.kalab_signatures for select to authenticated
  using (kalab_id = auth.uid() or public.current_app_role() = 'super_admin');

grant select on public.request_documents to authenticated;
alter table public.request_documents enable row level security;
create policy request_documents_read on public.request_documents for select to authenticated
  using ((lab_usage_request_id is not null and public.can_view_lab_request(lab_usage_request_id))
      or (borrowing_id is not null and public.can_view_borrowing(borrowing_id)));

grant select on public.notifications to authenticated;
grant update (is_read) on public.notifications to authenticated;
alter table public.notifications enable row level security;
create policy notifications_read_own on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_update_own on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select on public.audit_logs to authenticated;
alter table public.audit_logs enable row level security;
create policy audit_logs_admin_read on public.audit_logs for select to authenticated
  using (public.current_app_role() = 'super_admin');

create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);

-- ===== 2. Storage: signatures (KaLab own folder). letters has no client policy (server only). =====
create policy signatures_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'signatures' and public.current_app_role() = 'kalab'
    and (storage.foldername(name))[1] = auth.uid()::text
    and lower(storage.extension(name)) = any (array['png','jpg','jpeg']));
create policy signatures_read_own on storage.objects for select to authenticated
  using (bucket_id = 'signatures' and (storage.foldername(name))[1] = auth.uid()::text);

-- ===== 3. KaLab signature =====
create or replace function public.set_kalab_signature(_path text)
returns uuid language plpgsql security definer set search_path = public as $$
declare _id uuid;
begin
  if public.current_app_role() is distinct from 'kalab' then raise exception 'Akses ditolak' using errcode = '42501'; end if;
  if _path is null or split_part(_path, '/', 1) <> auth.uid()::text
     or not exists (select 1 from storage.objects where bucket_id = 'signatures' and name = _path) then
    raise exception 'File tanda tangan belum diunggah';
  end if;
  update public.kalab_signatures set is_active = false where kalab_id = auth.uid() and is_active;
  insert into public.kalab_signatures (kalab_id, signature_file, method, is_active)
    values (auth.uid(), _path, 'image', true) returning id into _id;
  return _id;
end $$;
revoke execute on function public.set_kalab_signature(text) from public, anon;
grant execute on function public.set_kalab_signature(text) to authenticated;

-- ===== 4. Endorsement status for requester / KaLab (read-only, no RLS change) =====
create or replace function public.get_endorsement_status(_lab uuid, _borrow uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('status', e.status, 'created_at', e.created_at, 'endorsed_at', e.endorsed_at)
  from public.borrowing_endorsements e
  where (_lab is not null and e.lab_usage_request_id = _lab and public.can_view_lab_request(_lab))
     or (_borrow is not null and e.borrowing_id = _borrow and public.can_view_borrowing(_borrow))
  limit 1
$$;
revoke execute on function public.get_endorsement_status(uuid, uuid) from public, anon;
grant execute on function public.get_endorsement_status(uuid, uuid) to authenticated;

-- ===== 5. Account activation through an RPC so the audit trail knows the actor =====
create or replace function public.set_profile_active(_id uuid, _active boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.current_app_role() is distinct from 'super_admin' then raise exception 'Akses ditolak' using errcode = '42501'; end if;
  if _id = auth.uid() and not _active then raise exception 'Anda tidak dapat menonaktifkan akun sendiri.'; end if;
  update public.profiles set is_active = _active where id = _id;
  if not found then raise exception 'Pengguna tidak ditemukan'; end if;
end $$;
revoke execute on function public.set_profile_active(uuid, boolean) from public, anon;
grant execute on function public.set_profile_active(uuid, boolean) to authenticated;

-- ===== 6. In-app notifications from every status change =====
create or replace function public.notify_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare _owner uuid; _kalab uuid; _lab text; _who text; _subject text; _own text; _kl text; _is_lab boolean;
begin
  _is_lab := new.lab_usage_request_id is not null;
  if _is_lab then
    select r.requester_id, l.kalab_id, l.name into _owner, _kalab, _lab
      from public.lab_usage_requests r join public.laboratories l on l.id = r.laboratory_id
     where r.id = new.lab_usage_request_id;
    _subject := 'Pengajuan penggunaan ' || _lab;
    _own := '/laboratorium/pengajuan/' || new.lab_usage_request_id;
    _kl := '/pengajuan-lab/' || new.lab_usage_request_id;
  else
    select b.borrower_id, l.kalab_id, l.name into _owner, _kalab, _lab
      from public.equipment_borrowings b join public.laboratories l on l.id = b.laboratory_id
     where b.id = new.borrowing_id;
    _subject := 'Peminjaman alat & bahan di ' || _lab;
    _own := '/peminjaman/' || new.borrowing_id;
    _kl := _own;
  end if;
  select name into _who from public.profiles where id = _owner;

  if new.to_status = 'Diajukan' then
    insert into public.notifications (user_id, type, title, message, link_url)
    values (_kalab, 'request_new',
      case when _is_lab then 'Pengajuan penggunaan lab baru' else 'Pengajuan peminjaman baru' end,
      coalesce(_who, 'Pemohon') || ' mengajukan ' || lower(left(_subject, 1)) || substr(_subject, 2) || '.', _kl);
  elsif new.to_status = 'Disetujui' then
    insert into public.notifications (user_id, type, title, message, link_url)
    values (_owner, 'request_approved', 'Pengajuan disetujui', _subject || ' telah disetujui KaLab.', _own);
  elsif new.to_status = 'Ditolak' then
    insert into public.notifications (user_id, type, title, message, link_url)
    values (_owner, 'request_rejected', 'Pengajuan ditolak',
      _subject || ' ditolak.' || coalesce(' Alasan: ' || new.note, ''), _own);
  elsif new.to_status = 'Dipinjam' then
    insert into public.notifications (user_id, type, title, message, link_url)
    values (_owner, 'borrowing_ready', 'Barang siap diambil', _subject || ': barang sudah disiapkan KaLab.', _own);
  elsif new.to_status = 'Dikembalikan' then
    insert into public.notifications (user_id, type, title, message, link_url)
    values (_kalab, 'return_submitted', 'Bukti pengembalian masuk',
      coalesce(_who, 'Peminjam') || ' mengunggah bukti pengembalian. Mohon diverifikasi.', _kl);
  elsif new.to_status = 'Ditunggu' then
    insert into public.notifications (user_id, type, title, message, link_url)
    values (_kalab, 'return_pending', 'Peminjaman berstatus Ditunggu',
      'Pengembalian dari ' || coalesce(_who, 'peminjam') || ' tidak sesuai dan perlu tindak lanjut.', _kl),
           (_owner, 'return_pending', 'Pengembalian perlu tindak lanjut',
      _subject || ': hasil verifikasi tidak sesuai.' || coalesce(' Catatan: ' || new.note, ''), _own);
  elsif new.to_status = 'Dikonfirmasi' then
    insert into public.notifications (user_id, type, title, message, link_url)
    values (_owner, 'borrowing_done', 'Peminjaman selesai', _subject || ' telah dikonfirmasi selesai.', _own);
  end if;
  return new;
end $$;
revoke execute on function public.notify_status_change() from public, anon, authenticated;
create trigger trg_notify_status_change after insert on public.status_history
for each row execute function public.notify_status_change();

-- ===== 7. Audit log (written only by triggers) =====
create or replace function public.audit_write(_action text, _entity text, _id uuid, _old jsonb, _new jsonb, _actor uuid)
returns void language sql security definer set search_path = public as $$
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, old_value, new_value)
  select case when exists (select 1 from public.profiles where id = a.x) then a.x end, _action, _entity, _id, _old, _new
  from (select coalesce(_actor, auth.uid()) as x) a
$$;
revoke execute on function public.audit_write(text, text, uuid, jsonb, jsonb, uuid) from public, anon, authenticated;

create or replace function public.audit_request_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare _kind text := case when tg_table_name = 'lab_usage_requests' then 'lab_request' else 'borrowing' end;
begin
  if new.status is not distinct from old.status then return new; end if;
  perform public.audit_write(
    _kind || case new.status::text when 'Disetujui' then '.approve' when 'Ditolak' then '.reject' else '.status' end,
    tg_table_name, new.id,
    jsonb_build_object('status', old.status),
    jsonb_strip_nulls(jsonb_build_object('status', new.status, 'rejection_reason', new.rejection_reason)),
    null);
  return new;
end $$;
create trigger trg_audit_lab_request_status after update of status on public.lab_usage_requests
for each row execute function public.audit_request_status();
create trigger trg_audit_borrowing_status after update of status on public.equipment_borrowings
for each row execute function public.audit_request_status();

create or replace function public.audit_letter_issued()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.audit_write('letter.issue', 'request_documents', new.id, null,
    jsonb_strip_nulls(jsonb_build_object('letter_number', new.letter_number,
      'lab_usage_request_id', new.lab_usage_request_id, 'borrowing_id', new.borrowing_id)),
    new.issued_by);
  return new;
end $$;
create trigger trg_audit_letter_issued after insert on public.request_documents
for each row execute function public.audit_letter_issued();

create or replace function public.audit_module_publish()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'Published' and old.status is distinct from 'Published' then
    perform public.audit_write('module.publish', 'modules', new.id,
      jsonb_build_object('status', old.status), jsonb_build_object('status', new.status, 'title', new.title), null);
  end if;
  return new;
end $$;
create trigger trg_audit_module_publish after update of status on public.modules
for each row execute function public.audit_module_publish();

create or replace function public.audit_registration_decision()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.audit_write(
    case when new.decision = 'Disetujui' then 'registration.approve' else 'registration.reject' end,
    'user_registrations', new.registration_id, null,
    jsonb_strip_nulls(jsonb_build_object('decision', new.decision, 'rejection_reason', new.rejection_reason,
      'name', (select full_name from public.user_registrations where id = new.registration_id))),
    new.decided_by);
  return new;
end $$;
create trigger trg_audit_registration_decision after insert on public.registration_approvals
for each row execute function public.audit_registration_decision();

create or replace function public.audit_endorsement()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    perform public.audit_write('endorsement.endorse', 'borrowing_endorsements', new.id,
      jsonb_build_object('status', old.status),
      jsonb_strip_nulls(jsonb_build_object('status', new.status, 'note', new.note, 'request_type', new.request_type)),
      new.dean_id);
  end if;
  return new;
end $$;
create trigger trg_audit_endorsement after update of status on public.borrowing_endorsements
for each row execute function public.audit_endorsement();

create or replace function public.audit_profile_active()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_active is distinct from old.is_active then
    perform public.audit_write(case when new.is_active then 'account.activate' else 'account.deactivate' end,
      'profiles', new.id, jsonb_build_object('is_active', old.is_active),
      jsonb_build_object('is_active', new.is_active, 'name', new.name), null);
  end if;
  return new;
end $$;
create trigger trg_audit_profile_active after update of is_active on public.profiles
for each row execute function public.audit_profile_active();

revoke execute on function public.audit_request_status(), public.audit_letter_issued(), public.audit_module_publish(),
  public.audit_registration_decision(), public.audit_endorsement(), public.audit_profile_active()
  from public, anon, authenticated;

-- ===== 8. Aggregate dashboards (no names, no individual scores) =====
-- Averages with fewer than 3 scores are withheld so a single student's grade cannot be inferred.
create or replace function public.leadership_summary(_from date default null, _to date default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare _role public.app_role := public.current_app_role(); _ids uuid[]; _res jsonb;
begin
  if _role is null or _role not in ('kaprodi', 'wadek1', 'dekan') then
    raise exception 'Akses ditolak' using errcode = '42501';
  end if;
  if _role = 'kaprodi' then
    select array_agg(program_study_id) into _ids from public.profiles where id = auth.uid() and program_study_id is not null;
    if _ids is null then raise exception 'Program studi Kaprodi belum diatur'; end if;
  else
    select array_agg(id) into _ids from public.program_studies;
  end if;

  with ps as (select id, code, name from public.program_studies where id = any(_ids)),
  mods as (select m.id, m.status, c.program_study_id ps_id from public.modules m
           join public.courses c on c.id = m.course_id where c.program_study_id = any(_ids)),
  att as (select a.total_score, s.type, md.ps_id from public.assessment_attempts a
          join public.assessments s on s.id = a.assessment_id join mods md on md.id = s.module_id
          where a.status = 'graded' and a.total_score is not null
            and (_from is null or a.submitted_at::date >= _from) and (_to is null or a.submitted_at::date <= _to)),
  prog as (select lp.percent, lp.completed_at, md.ps_id from public.learning_progress lp join mods md on md.id = lp.module_id),
  acc as (select md.ps_id from public.module_access ma join mods md on md.id = ma.module_id),
  stu as (select p.program_study_id ps_id from public.profiles p join public.roles r on r.id = p.role_id
          where r.code = 'mahasiswa' and p.is_active and p.program_study_id = any(_ids)),
  req as (select r.status::text status, l.program_study_id ps_id from public.lab_usage_requests r
          join public.laboratories l on l.id = r.laboratory_id
          where l.program_study_id = any(_ids)
            and (_from is null or r.created_at::date >= _from) and (_to is null or r.created_at::date <= _to)),
  bor as (select b.status::text status, b.is_overdue, l.program_study_id ps_id from public.equipment_borrowings b
          join public.laboratories l on l.id = b.laboratory_id
          where l.program_study_id = any(_ids)
            and (_from is null or b.created_at::date >= _from) and (_to is null or b.created_at::date <= _to)),
  labs as (select l.id, l.program_study_id ps_id from public.laboratories l where l.program_study_id = any(_ids)),
  prow as (
    select ps.code, jsonb_build_object(
      'id', ps.id, 'code', ps.code, 'name', ps.name,
      'students', (select count(*) from stu where ps_id = ps.id),
      'labs', (select count(*) from labs where ps_id = ps.id),
      'modules_total', (select count(*) from mods where ps_id = ps.id),
      'modules_published', (select count(*) from mods where ps_id = ps.id and status = 'Published'),
      'module_access', (select count(*) from acc where ps_id = ps.id),
      'accessed', (select count(*) from prog where ps_id = ps.id),
      'completed', (select count(*) from prog where ps_id = ps.id and completed_at is not null),
      'avg_progress', (select round(avg(percent), 1) from prog where ps_id = ps.id),
      'posttest_n', (select count(*) from att where ps_id = ps.id and type = 'post_test'),
      'posttest_avg', (select case when count(*) >= 3 then round(avg(total_score), 1) end from att where ps_id = ps.id and type = 'post_test'),
      'pretest_n', (select count(*) from att where ps_id = ps.id and type = 'pre_test'),
      'pretest_avg', (select case when count(*) >= 3 then round(avg(total_score), 1) end from att where ps_id = ps.id and type = 'pre_test'),
      'lab_requests', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) from (select status, count(*) n from req where ps_id = ps.id group by status) x),
      'borrowings', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) from (select status, count(*) n from bor where ps_id = ps.id group by status) x),
      'overdue', (select count(*) from bor where ps_id = ps.id and is_overdue)
    ) j from ps)
  select jsonb_build_object(
    'scope', case when _role = 'kaprodi' then 'prodi' else 'fakultas' end,
    'role', _role,
    'prodi', coalesce((select jsonb_agg(j order by code) from prow), '[]'::jsonb),
    'totals', jsonb_build_object(
      'students', (select count(*) from stu),
      'labs', (select count(*) from labs),
      'modules_total', (select count(*) from mods),
      'modules_published', (select count(*) from mods where status = 'Published'),
      'module_access', (select count(*) from acc),
      'accessed', (select count(*) from prog),
      'completed', (select count(*) from prog where completed_at is not null),
      'avg_progress', (select round(avg(percent), 1) from prog),
      'posttest_n', (select count(*) from att where type = 'post_test'),
      'posttest_avg', (select case when count(*) >= 3 then round(avg(total_score), 1) end from att where type = 'post_test'),
      'pretest_n', (select count(*) from att where type = 'pre_test'),
      'pretest_avg', (select case when count(*) >= 3 then round(avg(total_score), 1) end from att where type = 'pre_test'),
      'lab_requests', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) from (select status, count(*) n from req group by status) x),
      'borrowings', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) from (select status, count(*) n from bor group by status) x),
      'overdue', (select count(*) from bor where is_overdue)),
    'endorsements', case when _role = 'dekan' then (
      select jsonb_build_object(
        'pending', count(*) filter (where e.status = 'Menunggu_Pengesahan'),
        'endorsed', count(*) filter (where e.status = 'Disahkan'),
        'endorsed_in_period', count(*) filter (where e.status = 'Disahkan'
            and (_from is null or e.endorsed_at::date >= _from) and (_to is null or e.endorsed_at::date <= _to)),
        'lab_usage', count(*) filter (where e.request_type = 'lab_usage'),
        'borrowing', count(*) filter (where e.request_type = 'borrowing'),
        'avg_days', round(avg(extract(epoch from (e.endorsed_at - e.created_at)) / 86400.0)::numeric, 1))
      from public.borrowing_endorsements e) end
  ) into _res;
  return _res;
end $$;
revoke execute on function public.leadership_summary(date, date) from public, anon;
grant execute on function public.leadership_summary(date, date) to authenticated;

-- KaLab operational summary for the labs they head
create or replace function public.lab_operations_summary(_from date default null, _to date default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare _res jsonb;
begin
  if public.current_app_role() is distinct from 'kalab' then raise exception 'Akses ditolak' using errcode = '42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', l.id, 'name', l.name, 'location', l.location,
    'lab_requests', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) from (
        select r.status::text status, count(*) n from public.lab_usage_requests r where r.laboratory_id = l.id
          and (_from is null or r.created_at::date >= _from) and (_to is null or r.created_at::date <= _to) group by 1) x),
    'borrowings', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) from (
        select b.status::text status, count(*) n from public.equipment_borrowings b where b.laboratory_id = l.id
          and (_from is null or b.created_at::date >= _from) and (_to is null or b.created_at::date <= _to) group by 1) x),
    'overdue', (select count(*) from public.equipment_borrowings b where b.laboratory_id = l.id and b.is_overdue),
    'sessions', (select count(*) from public.laboratory_schedule_entries s where s.laboratory_id = l.id and s.is_locked
          and (_from is null or s.date >= _from) and (_to is null or s.date <= _to)),
    'equipment_types', (select count(*) from public.equipment e where e.laboratory_id = l.id),
    'equipment_units', (select coalesce(sum(e.qty_total), 0) from public.equipment e where e.laboratory_id = l.id),
    'equipment_available', (select coalesce(sum(e.qty_available), 0) from public.equipment e where e.laboratory_id = l.id),
    'calibration', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) from (
        select c.status::text status, count(*) n from public.calibrations c join public.equipment e on e.id = c.equipment_id
         where e.laboratory_id = l.id group by 1) x),
    'consumables', (select count(*) from public.consumables c where c.laboratory_id = l.id),
    'low_stock', (select coalesce(jsonb_agg(jsonb_build_object('name', c.name, 'stock', c.stock, 'min', c.min_stock, 'unit', c.unit) order by c.name), '[]'::jsonb)
        from public.consumables c where c.laboratory_id = l.id and c.stock <= c.min_stock),
    'top_items', (select coalesce(jsonb_agg(t order by (t->>'qty')::numeric desc), '[]'::jsonb) from (
        select jsonb_build_object('name', coalesce(e.name, c.name), 'type', i.item_type, 'qty', sum(i.quantity)) t
          from public.borrowing_items i join public.equipment_borrowings b on b.id = i.borrowing_id
          left join public.equipment e on e.id = i.equipment_id left join public.consumables c on c.id = i.consumable_id
         where b.laboratory_id = l.id and b.status <> 'Ditolak'
           and (_from is null or b.created_at::date >= _from) and (_to is null or b.created_at::date <= _to)
         group by coalesce(e.name, c.name), i.item_type order by sum(i.quantity) desc limit 5) y)
  ) order by l.name), '[]'::jsonb) into _res
  from public.laboratories l where l.kalab_id = auth.uid();
  return jsonb_build_object('labs', _res);
end $$;
revoke execute on function public.lab_operations_summary(date, date) from public, anon;
grant execute on function public.lab_operations_summary(date, date) to authenticated;